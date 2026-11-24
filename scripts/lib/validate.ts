import { Ajv } from "ajv";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import * as prettier from "prettier";
import { parse as parseYaml } from "yaml";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const USAGE = "usage: scripts/validate [--write] [--root <dir>]";

export const CLASSES = [
  "functional-feedback",
  "comprehension",
  "navigation",
  "error-prevention",
  "perceived-performance",
  "emotional-engagement",
  "decorative",
];
export const TIERS = ["core", "situational", "rarely-justified"];
export const STATUSES = ["researched", "validated", "retired"];
export const SECTIONS = [
  "Use when",
  "Avoid when",
  "Web technique",
  "Native technique",
  "Timing",
  "Accessibility",
  "Reduced motion",
  "Keyboard",
  "Performance",
  "Primitives to reuse",
  "Tests",
  "State integrity",
  "References",
];
const FIELDS = [
  "number",
  "name",
  "classes",
  "tier",
  "status",
  "date",
  "sources",
  "evidence",
];
const PAGE_FILE = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

type Page = {
  file: string;
  number: number;
  slug: string;
  name: string;
  tier: string;
  classes: string[];
  rule: string;
};

type Component = {
  file: string;
  id: string;
  name: string;
  status: string;
  purpose: string;
};

const isBlank = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "") ||
  (Array.isArray(value) && value.length === 0);

function isIsoDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function checkSource(source: unknown, root: string): string | null {
  if (typeof source !== "string" || source.trim() === "") return "a source is empty";
  if (/^https:\/\/\S+$/.test(source) && URL.canParse(source)) return null;
  if (
    source.startsWith("/") ||
    source.startsWith("~") ||
    source.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(source) ||
    source.startsWith("file:")
  ) {
    return `source "${source}" is a local absolute path`;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(source))
    return `source "${source}" is not an https:// URL`;
  const full = resolve(root, source);
  if (full !== root && !full.startsWith(root + sep)) {
    return `source "${source}" points outside the repository`;
  }
  if (!existsSync(full)) return `source "${source}" does not exist in the repository`;
  return null;
}

function checkPage(
  file: string,
  text: string,
  root: string,
  errors: string[],
): Page | null {
  const err = (message: string) => errors.push(`${file}: ${message}`);
  const name = file.split("/").pop() ?? file;
  const match = PAGE_FILE.exec(name);
  if (!match) {
    err("file name must be NN-slug.md (two digits, lower-case slug)");
    return null;
  }
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0] !== "---") {
    err("front matter is missing");
    return null;
  }
  const end = lines.indexOf("---", 1);
  if (end < 0) {
    err("front matter is not closed");
    return null;
  }
  let meta: Record<string, unknown>;
  try {
    const parsed: unknown = parseYaml(lines.slice(1, end).join("\n"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("not a mapping");
    }
    meta = parsed as Record<string, unknown>;
  } catch (error) {
    err(`front matter is not valid YAML: ${(error as Error).message}`);
    return null;
  }

  let valid = true;
  for (const field of FIELDS) {
    if (isBlank(meta[field])) {
      err(`front matter field "${field}" is missing or empty`);
      valid = false;
    }
  }
  const number = meta.number;
  if (!isBlank(number)) {
    if (!Number.isInteger(number) || (number as number) < 1 || (number as number) > 99) {
      err("number must be a whole number from 1 to 99");
      valid = false;
    } else if (String(number).padStart(2, "0") !== match[1]) {
      err(`file name number ${match[1]} does not match number ${String(number)}`);
      valid = false;
    }
  }
  if (!isBlank(meta.name) && typeof meta.name !== "string") err("name must be text");
  const classes = meta.classes;
  if (!isBlank(classes)) {
    if (!Array.isArray(classes) || !classes.every((c) => CLASSES.includes(c as string))) {
      err(`classes must be a list drawn from: ${CLASSES.join(", ")}`);
      valid = false;
    }
  }
  if (!isBlank(meta.tier) && !TIERS.includes(meta.tier as string)) {
    err(`tier must be one of: ${TIERS.join(", ")}`);
  }
  if (!isBlank(meta.status) && !STATUSES.includes(meta.status as string)) {
    err(`status must be one of: ${STATUSES.join(", ")}`);
  }
  if (!isBlank(meta.date) && !isIsoDate(meta.date))
    err("date must be an ISO date (YYYY-MM-DD)");
  if (!isBlank(meta.sources)) {
    if (!Array.isArray(meta.sources)) {
      err("sources must be a list");
    } else {
      for (const source of meta.sources) {
        const problem = checkSource(source, root);
        if (problem) err(problem);
      }
    }
  }
  if (!isBlank(meta.evidence) && typeof meta.evidence !== "string")
    err("evidence must be text");

  const body = lines.slice(end + 1);
  const titleIndex = body.findIndex((line) => line.trim() !== "");
  const title = titleIndex >= 0 ? (body[titleIndex] ?? "") : "";
  const expectedTitle = `# ${String(number)}. ${String(meta.name)}`;
  if (!title.startsWith("# ")) {
    err("the title (# N. Name) is missing");
    return null;
  }
  if (title.trim() !== expectedTitle) err(`the title must read "${expectedTitle}"`);

  const sections = new Map<string, string[]>();
  const intro: string[] = [];
  let current: string[] = intro;
  for (const line of body.slice(titleIndex + 1)) {
    const heading = /^## (.+?)\s*$/.exec(line);
    if (heading) {
      const label = heading[1] ?? "";
      if (sections.has(label)) err(`section "${label}" appears twice`);
      current = [];
      sections.set(label, current);
    } else if (/^# /.test(line)) {
      err("only one title is allowed");
    } else {
      current.push(line);
    }
  }
  const rule = intro.join(" ").replace(/\s+/g, " ").trim();
  if (!rule) err("the text under the title (the rule of use) is missing");
  for (const section of SECTIONS) {
    const content = sections.get(section);
    if (!content) err(`section "## ${section}" is missing`);
    else if (content.join("").trim() === "") err(`section "## ${section}" is empty`);
  }

  if (!valid) return null;
  return {
    file,
    number: number as number,
    slug: match[2] ?? "",
    name: String(meta.name),
    tier: String(meta.tier),
    classes: classes as string[],
    rule,
  };
}

async function listFiles(dir: string, suffix: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort();
}

async function format(text: string, fileName: string): Promise<string> {
  const config = (await prettier.resolveConfig(join(repoRoot, fileName))) ?? {};
  return prettier.format(text, { ...config, filepath: fileName });
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

async function kbIndex(pages: Page[]): Promise<string> {
  const rows = pages
    .sort((a, b) => a.number - b.number)
    .map(
      (page) =>
        `| ${page.number} | [${cell(page.name)}](patterns/${page.file.split("/").pop() ?? ""}) | ${page.tier} | ${page.classes.join(", ")} | ${cell(page.rule)} |`,
    );
  const text = [
    "# Pattern index",
    "",
    "Written by `scripts/validate --write` from `kb/patterns/`. Do not edit by hand.",
    "",
    "| No. | Name | Tier | Classes | Rule of use |",
    "| --- | ---- | ---- | ------- | ----------- |",
    ...rows,
    "",
  ].join("\n");
  return format(text, "kb/INDEX.md");
}

async function catalogueIndex(components: Component[]): Promise<string> {
  const list = components
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, name, status, purpose, file }) => ({ id, name, status, purpose, file }));
  return format(JSON.stringify({ components: list }), "catalogue/index.json");
}

async function checkGenerated(
  root: string,
  relative: string,
  expected: string | null,
  write: boolean,
  errors: string[],
): Promise<void> {
  // With nothing to index, nothing is written and nothing is expected.
  if (expected === null) return;
  const file = join(root, relative);
  const current = existsSync(file) ? await readFile(file, "utf8") : null;
  if (current === expected) return;
  if (write) {
    await writeFile(file, expected);
    process.stdout.write(`wrote ${relative}\n`);
    return;
  }
  errors.push(`${relative}: stale or missing; run scripts/validate --write`);
}

async function main(): Promise<number> {
  let values;
  try {
    values = parseArgs({
      options: { write: { type: "boolean", default: false }, root: { type: "string" } },
      strict: true,
    }).values;
  } catch (error) {
    process.stderr.write(`validate: ${(error as Error).message}\n${USAGE}\n`);
    return 2;
  }
  const root = resolve(values.root ?? repoRoot);
  const write = values.write ?? false;
  const errors: string[] = [];

  const pages: Page[] = [];
  const patternDir = join(root, "kb/patterns");
  for (const name of await listFiles(patternDir, ".md")) {
    const file = `kb/patterns/${name}`;
    const page = checkPage(file, await readFile(join(root, file), "utf8"), root, errors);
    if (page) pages.push(page);
  }
  const byNumber = new Map<number, string>();
  const bySlug = new Map<string, string>();
  for (const page of pages) {
    const sameNumber = byNumber.get(page.number);
    if (sameNumber)
      errors.push(`${page.file}: number ${page.number} is also used by ${sameNumber}`);
    byNumber.set(page.number, page.file);
    const sameSlug = bySlug.get(page.slug);
    if (sameSlug)
      errors.push(`${page.file}: slug "${page.slug}" is also used by ${sameSlug}`);
    bySlug.set(page.slug, page.file);
  }

  const components: Component[] = [];
  const componentDir = join(root, "catalogue/components");
  for (const name of await listFiles(componentDir, ".yml")) {
    errors.push(`catalogue/components/${name}: components are .yaml files`);
  }
  const componentFiles = await listFiles(componentDir, ".yaml");
  if (componentFiles.length > 0) {
    const schemaFile = join(root, "catalogue/schema.json");
    if (!existsSync(schemaFile)) {
      errors.push("catalogue/schema.json: missing, so components cannot be checked");
    } else {
      const schema = JSON.parse(await readFile(schemaFile, "utf8")) as object;
      const ajv = new Ajv({ allErrors: true, strict: true });
      const check = ajv.compile(schema);
      const ids = new Map<string, string>();
      for (const name of componentFiles) {
        const file = `catalogue/components/${name}`;
        let data: unknown;
        try {
          data = parseYaml(await readFile(join(root, file), "utf8"));
        } catch (error) {
          errors.push(`${file}: not valid YAML: ${(error as Error).message}`);
          continue;
        }
        if (!check(data)) {
          for (const problem of check.errors ?? []) {
            errors.push(
              `${file}: ${problem.instancePath || "/"} ${problem.message ?? ""}`,
            );
          }
          continue;
        }
        const entry = data as Component & { id: string; changelog: { date: string }[] };
        entry.changelog.forEach((change, index) => {
          if (!isIsoDate(change.date)) {
            errors.push(
              `${file}: changelog[${index}].date ${change.date} is not a real date`,
            );
          }
        });
        if (`${entry.id}.yaml` !== name) {
          errors.push(`${file}: file name must be ${entry.id}.yaml`);
        }
        const same = ids.get(entry.id);
        if (same) errors.push(`${file}: id "${entry.id}" is also used by ${same}`);
        ids.set(entry.id, file);
        components.push({ ...entry, file });
      }
    }
  }

  if (errors.length === 0) {
    await checkGenerated(
      root,
      "kb/INDEX.md",
      pages.length > 0 ? await kbIndex(pages) : null,
      write,
      errors,
    );
    await checkGenerated(
      root,
      "catalogue/index.json",
      components.length > 0 ? await catalogueIndex(components) : null,
      write,
      errors,
    );
  }

  for (const error of errors) process.stderr.write(`${error}\n`);
  if (errors.length > 0) return 1;
  process.stdout.write(
    `validate: ${pages.length} pattern page(s), ${components.length} component(s), all valid\n`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`validate: ${(error as Error).stack ?? String(error)}\n`);
    process.exit(2);
  },
);
