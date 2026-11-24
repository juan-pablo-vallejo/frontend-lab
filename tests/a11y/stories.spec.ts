import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { StaticServer } from "../../scripts/lib/server.ts";
import { openStory, serveStories, storyIndex } from "../lib/storybook.ts";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const stories = storyIndex();

let server: StaticServer;
test.beforeAll(async () => {
  server = await serveStories();
});
test.afterAll(async () => {
  await server?.close();
});

test("the story build lists the stories of all three components", () => {
  const titles = new Set(stories.map((s) => s.title));
  expect([...titles].sort()).toEqual(["Busy button", "Command list", "Toast with Undo"]);
});

for (const { id } of stories) {
  for (const width of [390, 1280]) {
    test(`${id} has no axe violation at ${width}`, async ({ page }) => {
      await openStory(page, server.url, id, width);
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
}
