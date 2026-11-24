import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { keyForAxeRule, type Key } from "./keys.ts";
import type {
  AxeUnit,
  AxeViolation,
  ConsoleRecord,
  Finding,
  Manifest,
  Measurements,
  MotionEntry,
  Standards,
  Unit,
} from "./types.ts";

const USAGE = "usage: scripts/measure --in <dir> [--standards <file>]";
const DEFAULT_STANDARDS = join(dirname(fileURLToPath(import.meta.url)), "standards.json");

// Properties whose animation is still acceptable when reduced motion is asked for.
const CALM_PROPERTY =
  /^(opacity|color|accent-color|caret-color|fill|stroke|background-color|outline-color|text-decoration-color|column-rule-color|border(-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?-color)$/;

class Unreadable extends Error {}

async function readJson<T>(file: string): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    throw new Unreadable(`cannot read ${file}: ${(error as Error).message}`);
  }
}

async function loadStandards(file: string | undefined): Promise<Standards> {
  const defaults = await readJson<Standards>(DEFAULT_STANDARDS);
  if (!file) return defaults;
  const override = await readJson<Partial<Standards>>(resolve(file));
  return {
    ...defaults,
    ...override,
    contrast: { ...defaults.contrast, ...(override.contrast ?? {}) },
  };
}

function judgeUnit(
  unit: Unit,
  axe: AxeViolation[],
  m: Measurements,
  record: ConsoleRecord,
  s: Standards,
): Finding[] {
  const findings: Finding[] = [];
  const at = { route: unit.route, width: unit.width, lang: unit.lang, state: unit.state };
  const add = (
    key: Key,
    selector: string,
    measured: unknown,
    threshold: unknown,
    rule?: string,
  ) =>
    findings.push({
      key,
      unit: at,
      selector,
      measured,
      threshold,
      evidence: rule ? { shot: unit.shot, rule } : { shot: unit.shot },
    });

  for (const violation of axe) {
    const key = keyForAxeRule(violation.id);
    for (const node of violation.nodes) {
      if (key === "contrast") {
        const large = String(node.data?.expectedContrastRatio ?? "").startsWith("3");
        add(
          key,
          node.selector,
          node.data?.contrastRatio ?? node.summary,
          large ? s.contrast.largeText : s.contrast.text,
          violation.id,
        );
      } else if (key === "target-size") {
        const box = node.box;
        add(
          key,
          node.selector,
          box ? { width: box.width, height: box.height } : node.summary,
          24,
          violation.id,
        );
      } else if (key === "missing-label") {
        add(key, node.selector, "no accessible name", "a label", violation.id);
      } else {
        add(
          key,
          node.selector,
          node.summary || violation.help,
          violation.impact,
          violation.id,
        );
      }
    }
  }

  if (s.targetSize > 24) {
    for (const item of m.interactive) {
      if (item.inlineInText) continue;
      if (item.box.width < s.targetSize || item.box.height < s.targetSize) {
        add(
          "target-size",
          item.selector,
          { width: item.box.width, height: item.box.height },
          s.targetSize,
        );
      }
    }
  }

  if (m.overflow.scrollWidth > m.overflow.clientWidth) {
    add(
      "overflow",
      m.overflow.elements[0]?.selector ?? "html",
      m.overflow.scrollWidth,
      m.overflow.clientWidth,
    );
  }

  for (const stop of m.focus.stops) {
    // `auto` is the browser's own ring; its computed width is not what is drawn.
    if (stop.outlineStyle === "auto" && stop.changedProperties.includes("outline"))
      continue;
    if (stop.changed === false) {
      add("focus-ring", stop.selector, "no visible change on focus", s.minFocusOutline);
    } else if (
      stop.changed &&
      stop.changedProperties.length === 1 &&
      stop.changedProperties[0] === "outline" &&
      stop.outlineWidth < s.minFocusOutline
    ) {
      add("focus-ring", stop.selector, stop.outlineWidth, s.minFocusOutline);
    }
  }

  if (m.layoutShift.score > s.maxLayoutShift) {
    const largest = [...m.layoutShift.shifts]
      .filter((shift) => !shift.hadRecentInput)
      .sort((a, b) => b.value - a.value)[0];
    add(
      "layout-shift",
      largest?.sources[0] ?? "html",
      m.layoutShift.score,
      s.maxLayoutShift,
    );
  }

  const seen = new Set<string>();
  const once = (entry: MotionEntry, key: string) => {
    const id = `${key} ${entry.selector} ${entry.kind} ${entry.name ?? entry.properties.join()}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  };
  for (const entry of m.motion.noPreference ?? m.motion.reduce) {
    if (entry.iterations === "infinite") continue;
    if (entry.durationMs > s.maxAnimationMs && once(entry, "long")) {
      add("long-animation", entry.selector, entry.durationMs, s.maxAnimationMs);
    }
  }
  for (const entry of m.motion.reduce) {
    if (entry.iterations === "infinite") {
      if (once(entry, "reduced")) {
        add("reduced-motion", entry.selector, "loops under reduced motion", "no loop");
      }
      continue;
    }
    const moving = entry.properties.filter((p) => !CALM_PROPERTY.test(p));
    if (entry.properties.length === 0) moving.push("unknown properties");
    if (moving.length > 0 && once(entry, "reduced")) {
      add(
        "reduced-motion",
        entry.selector,
        `animates ${moving.join(", ")} under reduced motion`,
        "opacity or colour only",
      );
    }
  }

  for (const item of m.truncation) {
    if (item.kind === "single-line") {
      add("truncation", item.selector, item.scrollWidth, item.clientWidth);
    } else {
      add("truncation", item.selector, item.scrollHeight, item.clientHeight);
    }
  }

  for (const message of record.messages) {
    if (message.type === "error") add("console-error", "console", message.text, "none");
  }
  for (const error of record.pageErrors) add("console-error", "page", error, "none");
  for (const request of record.failedRequests) {
    add("request-failed", request.url, request.failure, "none");
  }
  return findings;
}

function show(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function main(): Promise<number> {
  let values;
  try {
    values = parseArgs({
      options: { in: { type: "string" }, standards: { type: "string" } },
      strict: true,
    }).values;
  } catch (error) {
    process.stderr.write(`measure: ${(error as Error).message}\n${USAGE}\n`);
    return 2;
  }
  if (!values.in) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const dir = resolve(values.in);
  let findings: Finding[];
  const notices: string[] = [];
  let failed: string[];
  try {
    const standards = await loadStandards(values.standards);
    const manifest = await readJson<Manifest>(join(dir, "manifest.json"));
    const axe = await readJson<Record<string, AxeUnit>>(join(dir, "axe.json"));
    const measure = await readJson<Record<string, Measurements>>(
      join(dir, "measure.json"),
    );
    const consoleRecords = await readJson<Record<string, ConsoleRecord>>(
      join(dir, "console.json"),
    );
    if (!Array.isArray(manifest.units) || !Array.isArray(manifest.failed)) {
      throw new Unreadable("manifest.json has no units or failed list");
    }
    findings = [];
    for (const unit of manifest.units) {
      const m = measure[unit.id];
      const a = axe[unit.id];
      const c = consoleRecords[unit.id];
      if (!m) throw new Unreadable(`measure.json has no entry for ${unit.id}`);
      if (!a || !Array.isArray(a.violations)) {
        throw new Unreadable(`axe.json has no entry for ${unit.id}`);
      }
      if (!c) throw new Unreadable(`console.json has no entry for ${unit.id}`);
      findings.push(...judgeUnit(unit, a.violations, m, c, standards));
      // Notices: what limits the measurement of a unit, not a finding about the page.
      if (!m.settled) {
        notices.push(
          `${unit.id}: the page had not settled (finite animations after 5 s)`,
        );
      }
      if (m.focus.limitReached) {
        notices.push(`${unit.id}: the focus walk stopped at 60 stops`);
      }
      const undecided = a.incomplete ?? [];
      if (undecided.length > 0) {
        notices.push(
          `${unit.id}: axe could not decide ${undecided.length} rule(s): ${undecided.map((r) => r.id).join(", ")}`,
        );
      }
    }
    // A capture made before notes existed has none.
    for (const n of manifest.notes ?? []) notices.push(`${n.id}: ${n.note}`);
    failed = manifest.failed.map((f) => f.id);
  } catch (error) {
    if (error instanceof Unreadable) {
      process.stderr.write(`measure: ${error.message}\n`);
      return 2;
    }
    throw error;
  }

  await writeFile(join(dir, "findings.json"), `${JSON.stringify(findings, null, 2)}\n`);
  for (const f of findings) {
    const unit = [f.unit.route, f.unit.width, f.unit.lang, f.unit.state ?? "base"].join(
      "/",
    );
    process.stdout.write(
      `${f.key}\t${unit}\t${f.selector}\tmeasured ${show(f.measured)}\tthreshold ${show(f.threshold)}\n`,
    );
  }
  for (const notice of notices) process.stderr.write(`notice: ${notice}\n`);
  if (failed.length > 0) {
    process.stderr.write(
      `measure: capture failed for ${failed.join(", ")}; these units have no measurements\n`,
    );
    return 2;
  }
  return findings.length > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`measure: ${(error as Error).stack ?? String(error)}\n`);
    process.exit(2);
  },
);
