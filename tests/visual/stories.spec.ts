import { expect, test } from "@playwright/test";
import type { StaticServer } from "../../scripts/lib/server.ts";
import { openStory, serveStories, storyIndex } from "../lib/storybook.ts";

test.skip(
  process.platform !== "linux" || process.env.VISUAL_REFS !== "1",
  "reference images are written and compared on the comparison machine only",
);

const stories = storyIndex();

let server: StaticServer;
test.beforeAll(async () => {
  server = await serveStories();
});
test.afterAll(async () => {
  await server?.close();
});

test("the story build lists stories", () => {
  expect(stories.length).toBeGreaterThan(0);
});

for (const { id } of stories) {
  for (const width of [390, 1280]) {
    test(`${id} at ${width}`, async ({ page }) => {
      await openStory(page, server.url, id, width);
      await expect(page).toHaveScreenshot(`${id}-${width}.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }
}
