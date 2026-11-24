import { expect, test } from "@playwright/test";
import { hasHomePath } from "../lib/home-path.ts";

// Every home path below is assembled at run time from these parts, so this file passes the
// guard itself. A line is written with §NAME§ placeholders.
const S = "/";
const B = "\\";
const parts: Record<string, string> = {
  U: ["", "Users", "someone", "x"].join(S),
  UH: ["", "Users", "someone"].join(S),
  H: ["", "home", "someone"].join(S),
  R: S + "root",
  BU: ["", "Users", "someone", "x"].join(B),
  JU: ["", "Users", "someone", "x"].join(B + S),
  PU: ["", "Users", "someone", "x"].join("%2F"),
  LU: ["", "users", "someone", "x"].join(S),
  E: ["", "Users", "éric", "x"].join(S),
  HO: ["", "home", "overview"].join(S),
  ROUTE: ["", "users", "42", "settings"].join(S),
  NL: B + "n",
  TAB: B + "t",
};
const line = (template: string) =>
  template.replace(/§(\w+)§/g, (_, k: string) => parts[k] ?? "");

// The reviewer's 68 lines, in order, with the verdict the ruling gives each.
const corpus: [string, boolean][] = [
  ["see !§U§ now", true],
  ['see "§U§ now', true],
  ["see #§U§ now", true],
  ["see $§U§ now", true],
  ["see %§U§ now", true],
  ["see &§U§ now", true],
  ["see '§U§ now", true],
  ["see (§U§ now", true],
  ["see )§U§ now", true],
  ["see *§U§ now", true],
  ["see +§U§ now", true],
  ["see ,§U§ now", true],
  ["see -§U§ now", true],
  ["see .§U§ now", false],
  ["see /§U§ now", true],
  ["see :§U§ now", true],
  ["see ;§U§ now", true],
  ["see <§U§ now", true],
  ["see =§U§ now", true],
  ["see >§U§ now", true],
  ["see ?§U§ now", true],
  ["see @§U§ now", true],
  ["see [§U§ now", true],
  [`see ${B}§U§ now`, true],
  ["see ]§U§ now", true],
  ["see ^§U§ now", true],
  ["see _§U§ now", false],
  ["see `§U§ now", true],
  ["see {§U§ now", true],
  ["see |§U§ now", true],
  ["see }§U§ now", true],
  ["see ~§U§ now", false],
  ["#!§UH§/.venv/bin/python", true],
  ["#!§H§/bin/tool", true],
  ["#!/usr/bin/env -S §H§/bin/tool", true],
  ["saved under **§U§** today", true],
  ["saved under *§U§* today", true],
  ["+§U§/config.json", true],
  ["+++ §U§/a.txt", true],
  ["open “§U§”", true],
  ["open ‘§U§’", true],
  ["«§U§»", true],
  ["path—§U§", true],
  ["•§U§", true],
  ["→§U§", true],
  ["pkg @ git+file://§U§/repo", true],
  ['"dep": "file:§U§/pkg"', true],
  ["cd§U§&&make", false],
  ["load @§U§/args.txt", true],
  ["$(§U§/bin/tool)", true],
  ["cmd 2>§U§/log", true],
  ["    at run (§U§/app.js:10:5)", true],
  ["webpack://app/.§U§/src/a.js", false],
  ['{"cwd":"§U§"}', true],
  ["cwd: §U§", true],
  ["PATH=/usr/bin:§H§/bin/tool", true],
  ["open%20§U§", true],
  ["#§U§/notes", true],
  ["!§U§/keep", true],
  ["/Volumes/Macintosh HD§U§", true],
  ["/Volumes/Data§U§", true],
  ["sftp://box/§H§/bin/tool", true],
  ["rsync://box/module§H§/bin/tool", false],
  ["<root><a/></root>", false],
  ["  </Root>", false],
  ["GET §ROUTE§", true],
  ["GET /users/{id}", false],
  ["if (§R§/.test(name)) return;", true],
];

// The reviewer's shapes file, in order.
const shapes: [string, boolean][] = [
  ["§UH§/notes/plan.md", true],
  ["§H§/work", true],
  ["cc -I§UH§/include -L§H§/lib main.c", true],
  ["tar -C§UH§/src -xf a.tar", true],
  ["/System/Volumes/Data§U§", true],
  ["/Volumes/Macintosh HD§U§", true],
  ["/mnt/c§U§", true],
  ["/c§U§", true],
  ["C:§BU§", true],
  ["C:§U§", true],
  ['{"out":"line one§NL§§U§"}', true],
  ['{"out":"col§TAB§§H§/x"}', true],
  ['{"p":"§JU§"}', true],
  ["open?path=§PU§", true],
  ["file://localhost§U§", true],
  ["vscode://file§U§", true],
  ["§LU§", true],
  ["§R§/.ssh/config", true],
  ["/var§H§/x", true],
  ["/export§H§/x", true],
  ["sftp://box/§H§/x", true],
  ["§E§", true],
  ["~someone/x and ~/x", false],
  ['{ "id": "home", "path": "§HO§" }', true],
];

// Lines the ruling says must pass.
const allowed = [
  "https://example.org/home/page",
  "docs/home/x",
  "./home/x",
  "~/x",
  "</Root>",
  "</root>",
  "<Home />",
  "a/users/b",
];

test("the reviewer's 68 lines get the ruled verdicts", () => {
  const wrong = corpus
    .map(([template, flagged], index) => ({ index: index + 1, template, flagged }))
    .filter(({ template, flagged }) => hasHomePath(line(template)) !== flagged)
    .map(
      ({ index, template, flagged }) =>
        `${index}: ${template} should ${flagged ? "" : "not "}be flagged`,
    );
  expect(wrong).toEqual([]);
});

test("the reviewer's shapes get the ruled verdicts", () => {
  const wrong = shapes
    .map(([template, flagged], index) => ({ index: index + 1, template, flagged }))
    .filter(({ template, flagged }) => hasHomePath(line(template)) !== flagged)
    .map(
      ({ index, template, flagged }) =>
        `${index}: ${template} should ${flagged ? "" : "not "}be flagged`,
    );
  expect(wrong).toEqual([]);
});

test("ordinary markup, URLs and relative paths pass", () => {
  expect(allowed.filter((text) => hasHomePath(text))).toEqual([]);
});

// Round 2, N4: a URL with no path in the same unbroken token is not a host for the path.
const afterUrlNoPath = [
  '{"homepage":"https://example.org","cwd":"§U§"}',
  "?next=https://example.org&file=§U§",
  "https://example.org,§U§,ok",
  '["http://localhost:3000","§U§"]',
  "REGISTRY=https://registry.example.org;CACHE=§U§",
];

test("N4: a path after a URL that has no path, in one token, is flagged", () => {
  expect(afterUrlNoPath.filter((template) => !hasHomePath(line(template)))).toEqual([]);
});

// Round 2, N5: alias imports and rooted web paths with a folder called home or users.
const webPaths = [
  'import Home from "@/pages/home/Home"',
  'import { UserList } from "@/features/users/UserList"',
  'fetch("/api/users/42")',
  "GET /v1/users/me",
  'http.get("/api/users/:id", handler)',
  '<img src="/images/home/hero.png">',
  "[Intro](/docs/home/intro)",
  'import App from "/src/pages/home/App.tsx"',
  '{ "id": "feed", "path": "/app/home/feed" }',
  "eslint --ignore-pattern=apps/web/home/legacy.ts",
];

test("N5: alias imports and rooted web paths pass", () => {
  expect(webPaths.filter((text) => hasHomePath(text))).toEqual([]);
});

test("a line of 200,000 characters with one match is judged in well under a second", () => {
  const long = [
    `${"a".repeat(199_970)} ${line("§U§")}`,
    `${"a/".repeat(99_985)}${line("§U§")}`,
    `${"-".repeat(199_970)}${line("§U§")}`,
  ];
  for (const text of long) {
    expect(text.length).toBeGreaterThanOrEqual(199_980);
    const started = performance.now();
    hasHomePath(text);
    expect(performance.now() - started).toBeLessThan(250);
  }
  expect(hasHomePath(long[0] ?? "")).toBe(true);
});
