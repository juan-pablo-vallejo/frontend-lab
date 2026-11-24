import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { removeTempDirs, repoRoot, runScript, tempDir } from "./helpers.ts";

test.afterAll(removeTempDirs);

const SECTIONS = [
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

type PageOptions = {
  number?: number;
  name?: string;
  fields?: Record<string, string | null>;
  rule?: string;
  sections?: Record<string, string | null>;
};

function page(options: PageOptions = {}): string {
  const number = options.number ?? 24;
  const name = options.name ?? "Toasts";
  const fields: Record<string, string | null> = {
    number: String(number),
    name,
    classes: "[functional-feedback]",
    tier: "core",
    status: "researched",
    date: "2026-11-23",
    sources: "\n  - https://www.w3.org/WAI/ARIA/apg/patterns/alert/",
    evidence: "Researched from the listed sources and checked by a second reader.",
    ...options.fields,
  };
  const front = Object.entries(fields)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key}:${value!.startsWith("\n") ? "" : " "}${value}`)
    .join("\n");
  const body = SECTIONS.map((section) => {
    const text =
      options.sections?.[section] === undefined ? "Text." : options.sections[section];
    return text === null ? "" : `## ${section}\n\n${text}\n`;
  }).join("\n");
  const rule = options.rule ?? "Show a short message that does not take focus.";
  return `---\n${front}\n---\n\n# ${number}. ${name}\n\n${rule}\n\n${body}`;
}

function component(id: string, overrides: Record<string, string> = {}): string {
  const fields: Record<string, string> = {
    id,
    name: "Toast",
    purpose: "Tells the person that an action finished.",
    platforms: "[web]",
    status: "experimental",
    dependencies: "\n  - name: react\n    version: 19.2.0",
    provenance:
      "\n  source: https://example.com/toast\n  commit: 0123456789abcdef0123456789abcdef01234567\n  spdx: MIT\n  changes: Rewritten against our tokens.",
    variants: "[default, error]",
    accessibility:
      "\n  role: status\n  keyboard:\n    Escape: dismisses\n  reduced_motion: fades only\n  scan: no violation",
    motion_tokens: "\n  enter: 200ms",
    tests:
      "\n  stories: [toast--default]\n  aria_snapshot: '- status: Saved'\n  visual_references: []",
    screenshots: "[]",
    known_limitations: "[]",
    changelog: "\n  - date: 2026-11-23\n    change: First version.",
    recipe: "Render inside a live region.",
    ...overrides,
  };
  return (
    Object.entries(fields)
      .map(([key, value]) => `${key}:${value.startsWith("\n") ? "" : " "}${value}`)
      .join("\n") + "\n"
  );
}

async function root(files: Record<string, string>, withSchema = true): Promise<string> {
  const dir = await tempDir("validate");
  if (withSchema) {
    await mkdir(join(dir, "catalogue"), { recursive: true });
    await copyFile(
      join(repoRoot, "catalogue/schema.json"),
      join(dir, "catalogue/schema.json"),
    );
  }
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), text);
  }
  return dir;
}

async function validate(dir: string, write = false) {
  return runScript("validate", ["--root", dir, ...(write ? ["--write"] : [])]);
}

test("an empty or missing kb/ and catalogue/ pass and nothing is written", async () => {
  const dir = await root({}, false);
  const result = await validate(dir, true);
  expect(result.code, result.stderr).toBe(0);
  expect(existsSync(join(dir, "kb"))).toBe(false);
  expect(existsSync(join(dir, "catalogue"))).toBe(false);
});

test("M16: with nothing to index, --write leaves an existing index alone", async () => {
  const dir = await root({ "kb/INDEX.md": "kept\n" }, false);
  const result = await validate(dir, true);
  expect(result.code, result.stderr).toBe(0);
  expect(result.stdout).not.toContain("wrote");
  expect(await readFile(join(dir, "kb/INDEX.md"), "utf8")).toBe("kept\n");
});

test("M16: a component saved as .yml is refused", async () => {
  const result = await validate(
    await root({ "catalogue/components/toast.yml": component("toast") }),
  );
  expect(result.code).toBe(1);
  expect(result.stderr).toContain(
    "catalogue/components/toast.yml: components are .yaml files",
  );
});

test("M16: a changelog date that does not exist is refused", async () => {
  const result = await validate(
    await root({
      "catalogue/components/toast.yaml": component("toast", {
        changelog: "\n  - date: 2026-13-45\n    change: First version.",
      }),
    }),
  );
  expect(result.code).toBe(1);
  expect(result.stderr).toContain("changelog[0].date 2026-13-45 is not a real date");
});

test("the repository itself passes", async () => {
  const result = await runScript("validate", [], { cwd: repoRoot });
  expect(result.code, result.stderr).toBe(0);
});

test("a good page and a good component pass; --write makes the indexes, then a change makes them stale", async () => {
  const dir = await root({
    "kb/patterns/24-toasts.md": page(),
    "catalogue/components/toast.yaml": component("toast"),
  });
  const before = await validate(dir);
  expect(before.code).toBe(1);
  expect(before.stderr).toContain("kb/INDEX.md: stale or missing");
  expect(before.stderr).toContain("catalogue/index.json: stale or missing");

  const written = await validate(dir, true);
  expect(written.code, written.stderr).toBe(0);
  const index = await readFile(join(dir, "kb/INDEX.md"), "utf8");
  expect(index).toContain("Toasts");
  expect(index).toContain("functional-feedback");
  expect(index).toContain("Show a short message that does not take focus.");
  const catalogue = JSON.parse(
    await readFile(join(dir, "catalogue/index.json"), "utf8"),
  ) as {
    components: { id: string }[];
  };
  expect(catalogue.components.map((c) => c.id)).toEqual(["toast"]);

  const again = await validate(dir);
  expect(again.code, again.stderr).toBe(0);

  await writeFile(
    join(dir, "kb/patterns/24-toasts.md"),
    page({ rule: "A new rule of use." }),
  );
  const stale = await validate(dir);
  expect(stale.code).toBe(1);
  expect(stale.stderr).toContain("kb/INDEX.md: stale or missing");
});

const badPages: [string, Record<string, string>, string][] = [
  [
    "a missing field",
    { "kb/patterns/24-toasts.md": page({ fields: { evidence: null } }) },
    'field "evidence" is missing',
  ],
  [
    "an empty field",
    { "kb/patterns/24-toasts.md": page({ fields: { evidence: '""' } }) },
    'field "evidence" is missing or empty',
  ],
  [
    "no sources",
    { "kb/patterns/24-toasts.md": page({ fields: { sources: "[]" } }) },
    'field "sources" is missing or empty',
  ],
  [
    "a missing section",
    { "kb/patterns/24-toasts.md": page({ sections: { Timing: null } }) },
    'section "## Timing" is missing',
  ],
  [
    "an empty section",
    { "kb/patterns/24-toasts.md": page({ sections: { Keyboard: "" } }) },
    'section "## Keyboard" is empty',
  ],
  [
    "no text under the title",
    { "kb/patterns/24-toasts.md": page({ rule: "" }) },
    "rule of use) is missing",
  ],
  [
    "a file name that does not match the number",
    { "kb/patterns/25-toasts.md": page() },
    "does not match number 24",
  ],
  [
    "two pages with one number",
    {
      "kb/patterns/24-toasts.md": page(),
      "kb/patterns/24-banners.md": page({ name: "Banners" }),
    },
    "number 24 is also used by",
  ],
  [
    "two pages with one slug",
    {
      "kb/patterns/24-toasts.md": page(),
      "kb/patterns/25-toasts.md": page({ number: 25 }),
    },
    'slug "toasts" is also used by',
  ],
  [
    "a local absolute source",
    {
      "kb/patterns/24-toasts.md": page({
        fields: { sources: "\n  - /" + "tmp/notes.md" },
      }),
    },
    "is a local absolute path",
  ],
  [
    "a source that is not https",
    {
      "kb/patterns/24-toasts.md": page({
        fields: { sources: "\n  - http://example.com/a" },
      }),
    },
    "is not an https:// URL",
  ],
  [
    "a source missing from the repository",
    { "kb/patterns/24-toasts.md": page({ fields: { sources: "\n  - kb/missing.md" } }) },
    "does not exist in the repository",
  ],
  [
    "an unknown class",
    { "kb/patterns/24-toasts.md": page({ fields: { classes: "[shiny]" } }) },
    "classes must be a list drawn from",
  ],
  [
    "a date that is not ISO",
    { "kb/patterns/24-toasts.md": page({ fields: { date: "23/11/2026" } }) },
    "date must be an ISO date",
  ],
  [
    "a bad tier",
    { "kb/patterns/24-toasts.md": page({ fields: { tier: "sometimes" } }) },
    "tier must be one of",
  ],
];

for (const [what, files, message] of badPages) {
  test(`a page fails on ${what}`, async () => {
    const result = await validate(await root(files));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(message);
  });
}

test("a source that is a path inside the repository passes", async () => {
  const dir = await root({
    "kb/notes/timing.md": "notes\n",
    "kb/patterns/24-toasts.md": page({ fields: { sources: "\n  - kb/notes/timing.md" } }),
  });
  const result = await validate(dir, true);
  expect(result.code, result.stderr).toBe(0);
});

const badComponents: [string, Record<string, string>, string][] = [
  [
    "a duplicate id",
    {
      "catalogue/components/toast.yaml": component("toast"),
      "catalogue/components/other.yaml": component("toast"),
    },
    'id "toast" is also used by',
  ],
  [
    "a file name that differs from its id",
    { "catalogue/components/toast.yaml": component("snackbar") },
    "file name must be snackbar.yaml",
  ],
  [
    "a bad status",
    { "catalogue/components/toast.yaml": component("toast", { status: "done" }) },
    "/status must be equal to one of the allowed values",
  ],
  [
    "a missing field",
    {
      "catalogue/components/toast.yaml": component("toast").replace(/^recipe:.*\n/m, ""),
    },
    "must have required property 'recipe'",
  ],
  [
    "a version range instead of an exact version",
    {
      "catalogue/components/toast.yaml": component("toast", {
        dependencies: "\n  - name: react\n    version: ^19.2.0",
      }),
    },
    "/dependencies/0/version must match pattern",
  ],
  [
    "a taken source without its commit and licence",
    {
      "catalogue/components/toast.yaml": component("toast", {
        provenance: "\n  source: https://example.com/toast\n  changes: Rewritten.",
      }),
    },
    "/provenance must have required property 'commit'",
  ],
  [
    "a source that is neither https nor original",
    {
      "catalogue/components/toast.yaml": component("toast", {
        provenance: "\n  source: ours\n  changes: written here",
      }),
    },
    "/provenance/source must match pattern",
  ],
];

test("a component written here passes with source original and no commit or licence", async () => {
  const dir = await root({
    "catalogue/components/toast.yaml": component("toast", {
      provenance: "\n  source: original\n  changes: written here",
    }),
  });
  const result = await validate(dir, true);
  expect(result.code, result.stderr).toBe(0);
});

for (const [what, files, message] of badComponents) {
  test(`a component fails on ${what}`, async () => {
    const result = await validate(await root(files));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(message);
  });
}
