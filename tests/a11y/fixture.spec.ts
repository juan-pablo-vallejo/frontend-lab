import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveFolder, type StaticServer } from "../../scripts/lib/server.ts";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../qa/fixtures/seeded-defects",
);
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

let server: StaticServer;
test.beforeAll(async () => {
  server = await serveFolder(fixtureDir);
});
test.afterAll(async () => {
  await server.close();
});

for (const width of [390, 1280]) {
  for (const lang of ["en", "es"]) {
    test(`clean.html has no axe violation at ${width} in ${lang}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${server.url}/clean.html?lang=${lang}`);
      await expect(page.locator(".notice")).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
}
