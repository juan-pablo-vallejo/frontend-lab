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

// The stories' pretend request is one setTimeout of 1200 ms; count how many start.
async function countRequests(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { requests: number };
    w.requests = 0;
    const original = window.setTimeout;
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...rest: unknown[]) => {
      if (delay === 1200) w.requests += 1;
      return original(handler, delay, ...rest);
    }) as typeof window.setTimeout;
  });
}
const requests = (page: Page) =>
  page.evaluate(() => (window as unknown as { requests: number }).requests);

const button = (page: Page) => page.getByRole("button", { name: /^(Save|Saving…)$/ });
const outcome = (page: Page) => page.locator('[role="status"]');

test("while pending: aria-busy, the busy label, aria-disabled, not disabled, focus kept", async ({
  page,
}) => {
  await countRequests(page);
  await openStory(page, server.url, "busy-button--idle");
  await button(page).focus();
  await page.keyboard.press("Enter");
  const b = button(page);
  await expect(b).toHaveAttribute("aria-busy", "true");
  await expect(b).toHaveAttribute("aria-disabled", "true");
  await expect(b).toHaveText("Saving…");
  await expect(b).not.toHaveAttribute("disabled", /.*/);
  await expect(b).toBeFocused();
  // The outcome is not reported before the promise settles.
  await expect(outcome(page)).toHaveText("");
  await expect(b).not.toHaveAttribute("aria-busy", "true");
  await expect(b).toHaveText("Save");
  await expect(b).toBeFocused();
  await expect(outcome(page)).toHaveText("Saved.");
});

test("a second press while pending starts nothing", async ({ page }) => {
  await countRequests(page);
  await openStory(page, server.url, "busy-button--idle");
  await button(page).focus();
  await page.keyboard.press("Enter");
  await expect(button(page)).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  // A pointer press too; force, because Playwright would wait for aria-disabled to clear.
  await button(page).click({ force: true });
  await expect(outcome(page)).toHaveText("Saved.");
  expect(await requests(page)).toBe(1);
});

test("the outcome is reported only after the promise settles", async ({ page }) => {
  await openStory(page, server.url, "busy-button--busy");
  await expect(button(page)).toHaveAttribute("aria-busy", "true");
  await page.waitForTimeout(1500);
  await expect(outcome(page)).toHaveText("");
  await expect(button(page)).toHaveText("Saving…");
});

test("succeeded and failed stories report their outcome in words", async ({ page }) => {
  await openStory(page, server.url, "busy-button--succeeded");
  await expect(outcome(page)).toHaveText("Saved.");
  await expect(button(page)).not.toHaveAttribute("aria-busy", "true");
  await openStory(page, server.url, "busy-button--failed");
  await expect(page.getByRole("alert")).toHaveText("Could not save. Try again.");
  await expect(button(page)).toHaveText("Save");
});

test("a failure stays until the next attempt, which clears it", async ({ page }) => {
  await openStory(page, server.url, "busy-button--failed");
  await expect(page.getByRole("alert")).toHaveText("Could not save. Try again.");
  await page.waitForTimeout(1500);
  await expect(page.getByRole("alert")).toHaveText("Could not save. Try again.");
  await button(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toHaveText("");
});

test("the button is at least the target size, and its focus ring lies outside it", async ({
  page,
}) => {
  await openStory(page, server.url, "busy-button--idle", 390);
  const box = await button(page).boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Tab");
  await expect(button(page)).toBeFocused();
  const ring = await button(page).evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      style: s.outlineStyle,
      width: parseFloat(s.outlineWidth),
      offset: parseFloat(s.outlineOffset),
      color: s.outlineColor,
      fill: s.backgroundColor,
    };
  });
  expect(ring.style).toBe("solid");
  expect(ring.width).toBeGreaterThanOrEqual(2);
  // The ring is the accent colour, as is the fill: it shows only outside the control.
  expect(ring.offset).toBeGreaterThanOrEqual(2);
  const ringBox = {
    x: box!.x - ring.offset - ring.width,
    y: box!.y - ring.offset - ring.width,
    right: box!.x + box!.width + ring.offset + ring.width,
    bottom: box!.y + box!.height + ring.offset + ring.width,
  };
  expect(ringBox.x).toBeLessThan(box!.x);
  expect(ringBox.y).toBeLessThan(box!.y);
  expect(ringBox.right).toBeGreaterThan(box!.x + box!.width);
  expect(ringBox.bottom).toBeGreaterThan(box!.y + box!.height);
});
