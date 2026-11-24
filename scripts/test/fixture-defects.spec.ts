import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fixtureTarget,
  removeTempDirs,
  runScript,
  tempDir,
  type Finding,
} from "./helpers.ts";

test.afterAll(removeTempDirs);

// The nine measurable defects seeded in qa/fixtures/seeded-defects/index.html. The three
// that need judgment (success shown early, status by colour alone, missing empty state) are
// not expected from the scripts.
const EXPECTED_KEYS = [
  "contrast",
  "focus-ring",
  "layout-shift",
  "long-animation",
  "missing-label",
  "overflow",
  "reduced-motion",
  "target-size",
  "truncation",
];

test.describe.configure({ mode: "serial" });

let out = "";
let measureCode = -1;
let findings: Finding[] = [];
let manifest: {
  browser: { name: string; version: string };
  playwright: string;
  units: { id: string; route: string; shot: string }[];
};

test.beforeAll(async () => {
  test.setTimeout(15 * 60_000);
  out = await tempDir("defects");
  const capture = await runScript("capture", [
    "--target",
    fixtureTarget,
    "--out",
    out,
    "--only",
    "defects",
  ]);
  expect(capture.code, capture.stderr).toBe(0);
  const measure = await runScript("measure", ["--in", out]);
  measureCode = measure.code;
  findings = JSON.parse(await readFile(join(out, "findings.json"), "utf8")) as Finding[];
  manifest = JSON.parse(
    await readFile(join(out, "manifest.json"), "utf8"),
  ) as typeof manifest;
});

test("measure exits 1 when it has findings", () => {
  expect(measureCode).toBe(1);
});

test("defects: exactly the nine seeded keys", () => {
  const keys = [...new Set(findings.map((finding) => finding.key))].sort();
  expect(keys).toEqual(EXPECTED_KEYS);
  expect(findings.every((finding) => finding.unit.route === "defects")).toBe(true);
});

test("overflow at 390 and not at 1280", () => {
  const widths = findings.filter((f) => f.key === "overflow").map((f) => f.unit.width);
  expect(widths).toContain(390);
  expect(widths).not.toContain(1280);
});

test("truncation in es and not in en", () => {
  const langs = findings.filter((f) => f.key === "truncation").map((f) => f.unit.lang);
  expect(langs).toContain("es");
  expect(langs).not.toContain("en");
});

test("each finding names a selector, a measured value and an existing screenshot", () => {
  for (const finding of findings) {
    const label = `${finding.key} in ${JSON.stringify(finding.unit)}`;
    expect(typeof finding.selector, label).toBe("string");
    expect(finding.selector.length, label).toBeGreaterThan(0);
    expect(finding.measured ?? null, label).not.toBeNull();
    expect(finding.measured, label).not.toBe("");
    expect(existsSync(join(out, finding.evidence.shot)), label).toBe(true);
  }
});

test("the manifest names the browser version and every screenshot exists", () => {
  expect(manifest.browser.version).toMatch(/^\d+\./);
  expect(manifest.playwright).toBe("1.65.0");
  // 1 route x 3 widths x 2 languages x (base + 4 states)
  expect(manifest.units).toHaveLength(30);
  for (const unit of manifest.units) {
    expect(unit.route).toBe("defects");
    expect(existsSync(join(out, unit.shot)), unit.id).toBe(true);
  }
});

test("M14: the confirmation state ends while the early 'Saved' is still showing", async ({
  page,
}) => {
  const { serveFolder } = await import("../lib/server.ts");
  const target = JSON.parse(await readFile(fixtureTarget, "utf8")) as {
    states: { id: string; steps: Record<string, unknown>[] }[];
  };
  const steps = target.states.find((s) => s.id === "confirmation")?.steps ?? [];
  const server = await serveFolder(join(fixtureTarget, "../seeded-defects"));
  try {
    await page.goto(`${server.url}/index.html?lang=en`);
    for (const step of steps) {
      if (typeof step.click === "string") await page.click(step.click);
      else if (typeof step.waitFor === "string") await page.waitForSelector(step.waitFor);
      else if (typeof step.waitMs === "number") await page.waitForTimeout(step.waitMs);
      else if (Array.isArray(step.fill)) {
        await page.fill(String(step.fill[0]), String(step.fill[1]));
      }
    }
    await expect(page.locator("#result")).toHaveText("Saved");
  } finally {
    await server.close();
  }
});
