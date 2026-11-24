import { defineConfig } from "@playwright/test";

for (const [name, value] of Object.entries({
  DO_NOT_TRACK: "1",
  STORYBOOK_DISABLE_TELEMETRY: "true",
  NEXT_TELEMETRY_DISABLED: "1",
  EXPO_NO_TELEMETRY: "1",
  MAESTRO_CLI_NO_ANALYTICS: "true",
})) {
  process.env[name] = value;
}

export default defineConfig({
  workers: 2,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  snapshotPathTemplate: "visual-refs/{testFilePath}/{arg}{ext}",
  use: { browserName: "chromium" },
  projects: [
    { name: "packages", testDir: "packages", testMatch: "*/test/**/*.spec.ts" },
    { name: "scripts", testDir: "scripts/test", timeout: 60_000 },
    { name: "a11y", testDir: "tests/a11y" },
    { name: "components", testDir: "tests/components" },
    { name: "visual", testDir: "tests/visual" },
  ],
});
