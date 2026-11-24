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

const field = (page: Page) => page.getByRole("combobox", { name: "Command" });
const listbox = (page: Page) => page.getByRole("listbox");
const options = (page: Page) => page.getByRole("option");
const result = (page: Page) => page.locator("output");

async function active(page: Page) {
  const id = await field(page).getAttribute("aria-activedescendant");
  const selected = page.locator('[role="option"][aria-selected="true"]');
  return { id, selected, selectedId: await selected.getAttribute("id") };
}

async function isHighlighted(page: Page, id: string) {
  // The highlighted row is the one drawn with the accent fill.
  return page.evaluate((rowId) => {
    const row = document.getElementById(rowId)!;
    const probe = document.createElement("div");
    probe.style.color = "var(--lab-accent)";
    document.body.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(row).backgroundColor === accent;
  }, id);
}

test("closed: a labelled combobox, collapsed, its listbox not shown", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--closed");
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");
  await expect(field(page)).toHaveAttribute("aria-autocomplete", "list");
  await expect(listbox(page)).toBeHidden();
  const controls = await field(page).getAttribute("aria-controls");
  expect(controls).toBeTruthy();
  await expect(page.locator(`[id="${controls}"][role="listbox"]`)).toHaveCount(1);
});

test("ArrowDown opens the list and makes the first option active", async ({ page }) => {
  await openStory(page, server.url, "command-list--closed");
  await field(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(field(page)).toHaveAttribute("aria-expanded", "true");
  const a = await active(page);
  expect(a.id).toBe(await options(page).first().getAttribute("id"));
});

test("after ArrowDown past the visible rows the active option lies inside the list's box", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--open-with-enough-results-to-scroll");
  const count = await options(page).count();
  expect(count).toBeGreaterThan(10);
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press("ArrowDown");
    const { id } = await active(page);
    const row = await page.locator(`[id="${id}"]`).boundingBox();
    const list = await listbox(page).boundingBox();
    expect(row!.y, `row ${i}`).toBeGreaterThanOrEqual(list!.y - 0.5);
    expect(row!.y + row!.height, `row ${i}`).toBeLessThanOrEqual(
      list!.y + list!.height + 0.5,
    );
  }
});

test("aria-activedescendant names the highlighted row, and only that row", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--open-with-few-results");
  for (const key of ["ArrowDown", "ArrowDown", "ArrowUp", "End", "Home"]) {
    await page.keyboard.press(key);
    const { id, selected, selectedId } = await active(page);
    await expect(selected).toHaveCount(1);
    expect(selectedId).toBe(id);
    expect(await isHighlighted(page, id!), key).toBe(true);
    for (const other of await options(page).all()) {
      const otherId = await other.getAttribute("id");
      if (otherId !== id) expect(await isHighlighted(page, otherId!)).toBe(false);
    }
  }
});

test("Enter activates the active option", async ({ page }) => {
  await openStory(page, server.url, "command-list--open-with-few-results");
  await page.keyboard.press("ArrowDown");
  const { id } = await active(page);
  const label = await page.locator(`[id="${id}"] [data-part="label"]`).textContent();
  await page.keyboard.press("Enter");
  await expect(result(page)).toHaveText(`Ran “${label}”.`);
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");
  await expect(field(page)).toBeFocused();
});

test("the result line is cleared when the filter changes", async ({ page }) => {
  await openStory(page, server.url, "command-list--open-with-few-results");
  await page.keyboard.press("Enter");
  await expect(result(page)).not.toHaveText("");
  await page.keyboard.type("x");
  await expect(result(page)).toHaveText("");
});

test("Home and End move to the first and last option, which stays in view", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--open-with-enough-results-to-scroll");
  await page.keyboard.press("End");
  let { id } = await active(page);
  expect(id).toBe(await options(page).last().getAttribute("id"));
  await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
  await page.keyboard.press("Home");
  ({ id } = await active(page));
  expect(id).toBe(await options(page).first().getAttribute("id"));
  await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
});

test("the active-at-end story has the last option active and fully in the list", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--active-option-at-the-end");
  const { id } = await active(page);
  expect(id).toBe(await options(page).last().getAttribute("id"));
  const row = await page.locator(`[id="${id}"]`).boundingBox();
  const list = await listbox(page).boundingBox();
  expect(row!.y + row!.height).toBeLessThanOrEqual(list!.y + list!.height + 0.5);
});

test("pointer and keyboard agree: hover makes a row active, the keys continue from it", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--open-with-few-results");
  const second = options(page).nth(1);
  await second.hover();
  let { id } = await active(page);
  expect(id).toBe(await second.getAttribute("id"));
  expect(await isHighlighted(page, id!)).toBe(true);
  await page.keyboard.press("ArrowDown");
  ({ id } = await active(page));
  expect(id).toBe(await options(page).nth(2).getAttribute("id"));
  // A click activates what it is on, and focus stays in the field.
  const label = await options(page).nth(0).locator('[data-part="label"]').textContent();
  await options(page).nth(0).click();
  await expect(result(page)).toHaveText(`Ran “${label}”.`);
  await expect(field(page)).toBeFocused();
});

test("keyboard scrolling does not hand the active row to a pointer that did not move", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--open-with-enough-results-to-scroll");
  await options(page).nth(1).hover();
  for (let i = 0; i < 10; i += 1) await page.keyboard.press("ArrowDown");
  const { id } = await active(page);
  expect(id).toBe(await options(page).nth(11).getAttribute("id"));
});

test("an empty result says so in words and offers the way out", async ({ page }) => {
  await openStory(page, server.url, "command-list--empty");
  await expect(page.getByText("No command matches this filter.")).toBeVisible();
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");
  await expect(options(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filter" }).click();
  await expect(field(page)).toHaveValue("");
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveAttribute("aria-expanded", "true");
  expect(await options(page).count()).toBeGreaterThan(10);
});

test("the count of results is announced through a status region present from load", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--closed");
  const status = page.locator('[role="status"]');
  await expect(status).toHaveCount(1);
  await expect(status).toHaveText("");
  // Rendered while empty, so it is in the accessibility tree before its text arrives.
  await expect(status).toBeVisible();
  expect(await status.evaluate((el) => getComputedStyle(el).display)).not.toBe("none");
  const before = await status.boundingBox();
  expect(before!.height).toBeGreaterThan(0);
  await field(page).focus();
  await page.keyboard.type("re");
  const n = await options(page).count();
  await expect(status).toHaveText(`${n} results`);
  // The line was reserved: the count takes it without moving what is below.
  expect((await status.boundingBox())!.height).toBe(before!.height);
  await page.keyboard.press("Escape");
  await expect(status).toHaveText("");
  await expect(status).toBeVisible();
});

test("Escape closes the open list; a second Escape clears the field", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--open-with-few-results");
  await page.keyboard.press("Escape");
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");
  await expect(field(page)).not.toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(field(page)).toHaveValue("");
});

test("the active row draws everything in it in the on-accent colour", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--open-with-few-results");
  const { id } = await active(page);
  const colours = await page.evaluate((rowId) => {
    const row = document.getElementById(rowId)!;
    const probe = document.createElement("div");
    probe.style.color = "var(--lab-on-accent)";
    document.body.append(probe);
    const onAccent = getComputedStyle(probe).color;
    probe.remove();
    return {
      onAccent,
      parts: [...row.querySelectorAll("*")].map((el) => getComputedStyle(el).color),
    };
  }, id!);
  expect(colours.parts.length).toBeGreaterThan(1);
  for (const c of colours.parts) expect(c).toBe(colours.onAccent);
});

test("few results: every row fits in the list without scrolling", async ({ page }) => {
  await openStory(page, server.url, "command-list--open-with-few-results");
  const count = await options(page).count();
  expect(count).toBeGreaterThanOrEqual(2);
  expect(count).toBeLessThanOrEqual(4);
  const fits = await listbox(page).evaluate((el) => el.scrollHeight <= el.clientHeight);
  expect(fits).toBe(true);
  const list = (await listbox(page).boundingBox())!;
  for (const row of await options(page).all()) {
    const box = (await row.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(list.y);
    expect(box.y + box.height).toBeLessThanOrEqual(list.y + list.height);
  }
});

test("in a modal dialog, Escape the field has no use for closes the dialog", async ({
  page,
}) => {
  await openStory(page, server.url, "command-list--closed");
  // The story's root, React's event root included, inside a native modal dialog.
  await page.evaluate(() => {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", "Commands");
    document.body.append(dialog);
    dialog.append(document.getElementById("storybook-root")!);
    dialog.showModal();
  });
  const dialog = page.locator("dialog");
  await field(page).focus();
  await page.keyboard.type("re");
  await expect(field(page)).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toHaveJSProperty("open", true);
  await page.keyboard.press("Escape");
  await expect(field(page)).toHaveValue("");
  await expect(dialog).toHaveJSProperty("open", true);
  // Closed and empty: the key is the dialog's.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveJSProperty("open", false);
});
