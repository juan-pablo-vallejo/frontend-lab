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
      for (const state of [
        "",
        "-panel",
        "-confirmation",
        "-saved",
        "-empty",
        "-pending",
        "-refused",
      ]) {
        expected.push(`clean-${width}-${lang}${state}`);
      }
    }
  }
  expect(ids).toEqual(expected.sort());
  for (const unit of manifest.units) {
    expect(existsSync(join(out, unit.shot)), unit.id).toBe(true);
  }
});

test("clean: the panel state leaves focus inside the panel, on the first field", async () => {
  const m = JSON.parse(await readFile(join(out, "measure.json"), "utf8")) as Record<
    string,
    { focusAfter: { selector: string } | null }
  >;
  for (const width of [390, 768, 1280]) {
    expect(m[`clean-${width}-en-panel`]?.focusAfter?.selector).toBe("#shift-person");
  }
});

test("clean: the refusal alert under Person is a live region, empty, in every panel unit", async () => {
  const m = JSON.parse(await readFile(join(out, "measure.json"), "utf8")) as Record<
    string,
    { liveRegions: { selector: string; role: string | null; text: string }[] }
  >;
  for (const width of [390, 768, 1280]) {
    for (const lang of ["en", "es"]) {
      expect(m[`clean-${width}-${lang}-panel`]?.liveRegions).toContainEqual(
        expect.objectContaining({ selector: "#person-error", role: "alert", text: "" }),
      );
    }
  }
});

type Evidence = {
  liveRegions: { selector: string; role: string | null; text: string }[];
  interactive: { selector: string; states: Record<string, string | boolean> }[];
  focusAfter: { selector: string; role: string; name: string } | null;
  held: {
    pattern: string;
    requests: {
      method: string;
      url: string;
      inFlightAtCapture: boolean;
      outcome: string;
      status: number | null;
    }[];
  }[];
};
const evidence = async (id: string): Promise<Evidence> => {
  const all = JSON.parse(await readFile(join(out, "measure.json"), "utf8")) as Record<
    string,
    Evidence
  >;
  const found = all[id];
  if (!found) throw new Error(`no unit ${id}`);
  return found;
};
const statesOf = (e: Evidence, selector: string) =>
  e.interactive.find((item) => item.selector === selector)?.states;
const textOf = (e: Evidence, selector: string) =>
  e.liveRegions.find((r) => r.selector === selector)?.text;

const SAVING = { en: "Saving…", es: "Guardando…" };
const REQUIRED = {
  en: "Enter the person's name.",
  es: "Escribe el nombre de la persona.",
};

test("clean: pending is measured in flight, after a second press, with one request made", async () => {
  for (const width of [390, 768, 1280]) {
    for (const lang of ["en", "es"] as const) {
      const e = await evidence(`clean-${width}-${lang}-pending`);
      const label = `${width} ${lang}`;
      expect(statesOf(e, "#save"), label).toEqual({ "aria-busy": "true" });
      expect(statesOf(e, "#close-panel"), label).toEqual({ "aria-disabled": "true" });
      expect(statesOf(e, "#shift-person"), label).toEqual({ readonly: true });
      expect(statesOf(e, "#shift-start"), label).toEqual({ readonly: true });
      expect(textOf(e, "#result"), label).toBe("");
      expect(textOf(e, "#person-error"), label).toBe("");
      // The busy look alone could come from the page's own 1.2 s wait: the evidence also
      // says the one save was still unanswered when the unit was measured, and was answered
      // once released.
      expect(e.held, label).toHaveLength(1);
      expect(e.held[0]?.requests, label).toEqual([
        expect.objectContaining({
          method: "POST",
          inFlightAtCapture: true,
          outcome: "answered",
          status: 200,
        }),
      ]);
      expect(e.focusAfter?.selector, label).toBe("#save");
      expect(e.focusAfter?.name, label).toBe(SAVING[lang]);
    }
  }
});

test("clean: refused shows the sentence in the alert, tied to Person, with focus there", async () => {
  for (const width of [390, 768, 1280]) {
    for (const lang of ["en", "es"] as const) {
      const e = await evidence(`clean-${width}-${lang}-refused`);
      const label = `${width} ${lang}`;
      expect(e.liveRegions, label).toContainEqual(
        expect.objectContaining({
          selector: "#person-error",
          role: "alert",
          text: REQUIRED[lang],
        }),
      );
      expect(statesOf(e, "#shift-person"), label).toEqual({
        "aria-invalid": "true",
        "aria-describedby": "person-error",
      });
      expect(e.focusAfter?.selector, label).toBe("#shift-person");
      expect(e.held, label).toEqual([]);
      expect(textOf(e, "#result"), label).toBe("");
    }
  }
});
