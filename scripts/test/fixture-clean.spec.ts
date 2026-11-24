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

test.describe.configure({ mode: "serial" });

let out = "";
let measure = { code: -1, stdout: "", stderr: "" };
let findings: Finding[] = [];
let manifest: { browser: { version: string }; units: { id: string; shot: string }[] };

test.beforeAll(async () => {
  test.setTimeout(15 * 60_000);
  out = await tempDir("clean");
  const capture = await runScript("capture", [
    "--target",
    fixtureTarget,
    "--out",
    out,
    "--only",
    "clean",
  ]);
  expect(capture.code, capture.stderr).toBe(0);
  measure = await runScript("measure", ["--in", out]);
  findings = JSON.parse(await readFile(join(out, "findings.json"), "utf8")) as Finding[];
  manifest = JSON.parse(
    await readFile(join(out, "manifest.json"), "utf8"),
  ) as typeof manifest;
});

test("clean: no finding in any unit", () => {
  expect(findings, measure.stdout).toEqual([]);
  expect(measure.code).toBe(0);
});

test("clean: every width, both languages and every state were captured", () => {
  expect(manifest.browser.version).toMatch(/^\d+\./);
  const ids = manifest.units.map((unit) => unit.id).sort();
  const expected: string[] = [];
  for (const width of [390, 768, 1280]) {
    for (const lang of ["en", "es"]) {
      for (const state of ["", "-panel", "-confirmation", "-saved", "-empty"]) {
        expected.push(`clean-${width}-${lang}${state}`);
      }
    }
  }
  expect(ids).toEqual(expected.sort());
  for (const unit of manifest.units) {
    expect(existsSync(join(out, unit.shot)), unit.id).toBe(true);
  }
});
