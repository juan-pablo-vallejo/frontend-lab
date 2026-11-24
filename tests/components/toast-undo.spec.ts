import { expect, test, type Page } from "@playwright/test";
import type { StaticServer } from "../../scripts/lib/server.ts";
import { openStory, serveStories } from "../lib/storybook.ts";

let server: StaticServer;
test.beforeAll(async () => {
  server = await serveStories();
});
test.afterAll(async () => {
  await server.close();
});

const region = (page: Page) => page.locator('[popover] > [role="status"]');
const toast = (page: Page) => region(page).locator("> *");
const undo = (page: Page) => page.getByRole("button", { name: "Undo" });
const dismiss = (page: Page) => page.getByRole("button", { name: "Dismiss" });
const archive = (page: Page) => page.getByRole("button", { name: "Archive" });
const current = (page: Page) => page.locator("h2");
const focusedName = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el && el !== document.body ? (el.textContent ?? "").trim() : "body";
  });

// Watches every status region of the toast from the page's first node. A region counts as
// ready when it has been seen empty while its popover was open, so in the page and drawn. Each
// region that later holds text is recorded with whether it was that same, ready element: a
// region made together with its message, or hidden until it, is not.
async function watchRegions(page: Page) {
  await page.addInitScript(() => {
    const ready = new WeakSet<Element>();
    const texts: boolean[] = [];
    const counted = new WeakSet<Element>();
    (window as unknown as { regionTexts: boolean[] }).regionTexts = texts;
    new MutationObserver(() => {
      for (const r of document.querySelectorAll('[popover] > [role="status"]')) {
        const open = r.parentElement?.matches(":popover-open") ?? false;
        if ((r.textContent ?? "") === "") {
          if (open) ready.add(r);
        } else if (!counted.has(r)) {
          counted.add(r);
          texts.push(ready.has(r));
        }
      }
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
}
const regionTexts = (page: Page) =>
  page.evaluate(() => (window as unknown as { regionTexts: boolean[] }).regionTexts);

test("the message is inserted into the region that was in the page, open and empty, before it", async ({
  page,
}) => {
  await watchRegions(page);
  await openStory(page, server.url, "toast-with-undo--shown");
  await expect(toast(page)).toContainText("Archived “Quarterly figures”");
  expect(await regionTexts(page)).toEqual([true]);
  await expect(region(page)).toHaveCount(1);
});

test("over a dialog, and when the dialog closes or opens while a message shows, no region arrives holding its text", async ({
  page,
}) => {
  await watchRegions(page);
  await openStory(page, server.url, "toast-with-undo--over-an-open-dialog");
  await expect(page.locator("dialog")).toContainText("Archived “Quarterly figures”");
  // The dialog closes while the message shows: the toast moves to the page.
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator("dialog")).toHaveJSProperty("open", false);
  await expect(toast(page)).toContainText("Archived “Quarterly figures”");
  // The dialog opens again while the message shows: the toast moves into it.
  await page.getByRole("button", { name: "Open message" }).click();
  await expect(page.locator("dialog")).toContainText("Archived “Quarterly figures”");
  const texts = await regionTexts(page);
  expect(texts.length).toBe(3);
  expect(texts).toEqual([true, true, true]);
});

for (const key of ["Control+z", "Meta+z"]) {
  test(`${key} triggers Undo while the toast shows and focus is not in a text field`, async ({
    page,
  }) => {
    await openStory(page, server.url, "toast-with-undo--shown");
    await expect(archive(page)).toBeFocused();
    await expect(current(page)).toHaveText("Team offsite");
    await page.keyboard.press(key);
    await expect(current(page)).toHaveText("Quarterly figures");
    await expect(toast(page)).toHaveCount(0);
  });
}

test("the shortcut is left to a text field that has focus", async ({ page }) => {
  await openStory(page, server.url, "toast-with-undo--shown");
  await page.getByRole("textbox", { name: "Note" }).focus();
  await page.keyboard.press("Control+z");
  await expect(current(page)).toHaveText("Team offsite");
  await expect(toast(page)).toContainText("Archived");
});

test("when the action left focus on the body, focus moves to Undo", async ({ page }) => {
  await openStory(page, server.url, "toast-with-undo--focus-moved-to-undo");
  await expect(undo(page)).toBeFocused();
});

test("when focus was elsewhere, the toast does not take it", async ({ page }) => {
  await openStory(page, server.url, "toast-with-undo--shown");
  await expect(archive(page)).toBeFocused();
});

test("Undo returns focus to the restored row's own button", async ({ page }) => {
  await openStory(page, server.url, "toast-with-undo--focus-moved-to-undo");
  await page.keyboard.press("Enter");
  await expect(toast(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Archive Quarterly figures" }),
  ).toBeFocused();
});

// Timing with the page's clock stopped: a message is shown at a known instant, the clock is
// moved by hand, and presence is counted once, never retried (a retry would let real time,
// and so the page's clock, run on).
async function freshMessageOnStoppedClock(page: Page) {
  await page.clock.install();
  await openStory(page, server.url, "toast-with-undo--shown");
  await dismiss(page).click();
  await expect(toast(page)).toHaveCount(0);
  // The pointer leaves, or the next toast would appear under it and rightly wait.
  await page.mouse.move(0, 0);
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);
  await archive(page).focus();
  await page.keyboard.press("Enter");
  await expect(toast(page)).toContainText("Archived “Team offsite”");
}

// Lets React render what a timer callback set: its scheduler posts through a MessageChannel,
// which the page's clock does not stop.
const settle = (page: Page) =>
  page.evaluate(async () => {
    for (let i = 0; i < 3; i += 1) {
      await new Promise<void>((done) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => done();
        channel.port2.postMessage(0);
      });
    }
  });
// A card that has begun to leave is no longer shown: its time is up.
async function shownAfter(page: Page, ms: number) {
  await page.clock.runFor(ms);
  await settle(page);
  return region(page).locator("> :not([data-leaving])").count();
}

test("it stays until just before 7 s and is gone just after", async ({ page }) => {
  await freshMessageOnStoppedClock(page);
  expect(await shownAfter(page, 6_900)).toBe(1);
  expect(await shownAfter(page, 200)).toBe(0);
  // Then its exit runs and it is removed.
  await page.clock.runFor(300);
  await expect(toast(page)).toHaveCount(0);
});

test("the timer pauses while the pointer is over the toast, then resumes with the time left", async ({
  page,
}) => {
  await freshMessageOnStoppedClock(page);
  expect(await shownAfter(page, 4_000)).toBe(1);
  await undo(page).hover({ force: true });
  expect(await shownAfter(page, 10_000)).toBe(1);
  await page.mouse.move(0, 0);
  // 3 s were left: still there after 2.9 s, gone after 3.1 s.
  expect(await shownAfter(page, 2_900)).toBe(1);
  expect(await shownAfter(page, 200)).toBe(0);
});

test("the timer pauses while focus is inside the toast, then resumes with the time left", async ({
  page,
}) => {
  await freshMessageOnStoppedClock(page);
  expect(await shownAfter(page, 4_000)).toBe(1);
  await undo(page).focus();
  expect(await shownAfter(page, 10_000)).toBe(1);
  await archive(page).focus();
  expect(await shownAfter(page, 2_900)).toBe(1);
  expect(await shownAfter(page, 200)).toBe(0);
});

test("Escape with focus inside dismisses it and focus returns to the action", async ({
  page,
}) => {
  await openStory(page, server.url, "toast-with-undo--shown");
  await undo(page).focus();
  await page.keyboard.press("Escape");
  await expect(toast(page)).toHaveCount(0);
  await expect(current(page)).toHaveText("Team offsite");
  expect(await focusedName(page)).toBe("Archive");
});

test("when the toast's own return target is gone, focus goes to the fallback heading", async ({
  page,
}) => {
  await openStory(page, server.url, "toast-with-undo--shown");
  // Archive the rest by keyboard: the last press removes the Archive button itself.
  for (const title of ["Team offsite", "Supplier invoice", "Holiday rota"]) {
    await expect(current(page)).toHaveText(title);
    await archive(page).focus();
    await page.keyboard.press("Enter");
  }
  await expect(undo(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toast(page)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Nothing left to archive" }),
  ).toBeFocused();
});

for (const how of ["Enter on Undo", "Escape"] as const) {
  test(`after the dialog has closed, ${how} returns focus to where it came from, not the hidden dialog`, async ({
    page,
  }) => {
    await openStory(page, server.url, "toast-with-undo--over-an-open-dialog");
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.locator("dialog")).toHaveJSProperty("open", false);
    await expect(page.getByRole("button", { name: "Open message" })).toBeFocused();
    // The toast is drawn again in the page a frame after the dialog closed.
    await expect(toast(page)).toContainText("Archived");
    await page.keyboard.press("Tab");
    await expect(undo(page)).toBeFocused();
    await page.keyboard.press(how === "Escape" ? "Escape" : "Enter");
    await expect(toast(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open message" })).toBeFocused();
  });
}

test("the close button dismisses it", async ({ page }) => {
  await openStory(page, server.url, "toast-with-undo--shown");
  await dismiss(page).click();
  await expect(toast(page)).toHaveCount(0);
  await expect(current(page)).toHaveText("Team offsite");
});

test("over an open modal dialog it is drawn on top and takes the pointer", async ({
  page,
}) => {
  await openStory(page, server.url, "toast-with-undo--over-an-open-dialog");
  await expect(page.locator("dialog")).toHaveJSProperty("open", true);
  const hit = await undo(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return Boolean(top && el.contains(top));
  });
  expect(hit).toBe(true);
  await undo(page).click();
  await expect(toast(page)).toHaveCount(0);
  await expect(page.locator("dialog h2")).toHaveText("Quarterly figures");
  await expect(page.locator("dialog")).toHaveJSProperty("open", true);
});

test("Escape inside the toast over a dialog closes the toast, not the dialog", async ({
  page,
}) => {
  await openStory(page, server.url, "toast-with-undo--over-an-open-dialog");
  await undo(page).focus();
  await page.keyboard.press("Escape");
  await expect(toast(page)).toHaveCount(0);
  await expect(page.locator("dialog")).toHaveJSProperty("open", true);
});

test("a refusal replaces the toast in the same place and stays until dismissed", async ({
  page,
}) => {
  await page.clock.install();
  await openStory(page, server.url, "toast-with-undo--refused");
  await expect(toast(page)).toContainText("Could not undo");
  await expect(undo(page)).toHaveCount(0);
  await page.clock.runFor(30_000);
  await expect(toast(page)).toContainText("Could not undo");
  await dismiss(page).click();
  await expect(toast(page)).toHaveCount(0);
});

test("the refusal takes the toast's place: same region, focus kept inside it", async ({
  page,
}) => {
  await openStory(page, server.url, "toast-with-undo--focus-moved-to-undo");
  const before = await toast(page).boundingBox();
  await page.getByRole("checkbox", { name: "Refuse the undo" }).evaluate((el) => {
    (el as HTMLInputElement).click();
  });
  await undo(page).focus();
  await page.keyboard.press("Enter");
  await expect(toast(page)).toContainText("Could not undo");
  // Measured once the entrance has run.
  await page.waitForFunction(() => document.getAnimations().length === 0);
  const after = await toast(page).boundingBox();
  expect(Math.abs(after!.y + after!.height - (before!.y + before!.height))).toBeLessThan(
    2,
  );
  await expect(dismiss(page)).toBeFocused();
});

test("under reduced motion no transform is animated, entering or leaving", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openStory(page, server.url, "toast-with-undo--shown");
  const watch = () =>
    page.evaluate(
      () =>
        new Promise<string[]>((done) => {
          const seen = new Set<string>();
          const t0 = performance.now();
          const tick = () => {
            for (const a of document.getAnimations()) {
              const t = a as CSSTransition;
              if (t.transitionProperty) seen.add(t.transitionProperty);
              const effect = a.effect as KeyframeEffect | null;
              for (const k of effect?.getKeyframes() ?? []) {
                if ("transform" in k) seen.add("transform");
              }
            }
            if (performance.now() - t0 < 600) requestAnimationFrame(tick);
            else done([...seen]);
          };
          tick();
        }),
    );
  // Leaving.
  const leaving = watch();
  await dismiss(page).click();
  expect(await leaving).not.toContain("transform");
  // Entering.
  await archive(page).focus();
  const entering = watch();
  await page.keyboard.press("Enter");
  const props = await entering;
  expect(props).not.toContain("transform");
  expect(props).toContain("opacity");
  expect(await toast(page).evaluate((el) => getComputedStyle(el).transform)).toBe("none");
});

test("without reduced motion it enters by transform and opacity only", async ({
  page,
}) => {
  await openStory(page, server.url, "toast-with-undo--shown");
  await dismiss(page).click();
  await expect(toast(page)).toHaveCount(0);
  await archive(page).focus();
  const props = page.evaluate(
    () =>
      new Promise<string[]>((done) => {
        const seen = new Set<string>();
        const t0 = performance.now();
        const tick = () => {
          for (const a of document.getAnimations()) {
            const t = a as CSSTransition;
            if (t.transitionProperty) seen.add(t.transitionProperty);
          }
          if (performance.now() - t0 < 400) requestAnimationFrame(tick);
          else done([...seen].sort());
        };
        tick();
      }),
  );
  await page.keyboard.press("Enter");
  expect(await props).toEqual(["opacity", "transform"]);
});

test("the reduced-motion story fades without moving", async ({ page }) => {
  await openStory(page, server.url, "toast-with-undo--reduced-motion");
  const style = await toast(page).evaluate((el) => {
    const s = getComputedStyle(el);
    return { property: s.transitionProperty, transform: s.transform };
  });
  expect(style.property).toBe("opacity");
  expect(style.transform).toBe("none");
});
