import { expect, test } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveFolder, type StaticServer } from "../../scripts/lib/server.ts";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../qa/fixtures/seeded-defects",
);

test.skip(
  process.platform !== "linux" || process.env.VISUAL_REFS !== "1",
  "reference images are written and compared on the comparison machine only",
);

let server: StaticServer;
test.beforeAll(async () => {
  server = await serveFolder(fixtureDir);
});
test.afterAll(async () => {
  await server.close();
});

for (const width of [390, 768, 1280]) {
  test(`clean.html at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${server.url}/clean.html?lang=en`);
    await expect(page.locator(".notice")).toBeVisible();
    await expect(page).toHaveScreenshot(`clean-${width}.png`, {
      fullPage: true,
      animations: "disabled",
    });
  });
}
