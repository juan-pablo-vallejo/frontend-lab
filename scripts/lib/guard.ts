import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { hasHomePath } from "./home-path.ts";

const USAGE = "usage: scripts/guard [--pre-push <remote> <url> | --ci] [--repo <dir>]";
const PATTERNS_ENV = "FRONTEND_LAB_GUARD_PATTERNS";
const IDENTITY_ENV = "FRONTEND_LAB_GUARD_IDENTITY";
const EXEMPT_FROM_PRIVATE_LIST = new Set(["LICENSE"]);
const ZERO = /^0+$/;
const DIFF_FLAGS = [
  "-p",
  "--text",
  "--no-ext-diff",
  "--no-textconv",
  "--no-renames",
  "--no-color",
  "--unified=0",
  "--src-prefix=a/",
  "--dst-prefix=b/",
];
const GITLEAKS_LOG_OPTS = "--text --no-textconv --diff-merges=first-parent";

// ---- Addresses and machine names ----------------------------------------------------------
const OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const PRIVATE_IPV4 = new RegExp(
  "(?<![\\p{L}\\d.])(?:10\\." +
    OCTET +
    "|172\\.(?:1[6-9]|2\\d|3[01])|192\\.168|169\\.254|100\\.(?:6[4-9]|[7-9]\\d|1[01]\\d|12[0-7]))" +
    `\\.${OCTET}\\.${OCTET}(?!\\d|\\.\\d)`,
  "u",
);
const LOCAL_IPV6 =
  /(?<![\p{L}\p{N}:])(?:f[cd][0-9a-f]{2}|fe[89ab][0-9a-f]):[0-9a-f:]*[0-9a-f:](?![\p{L}\p{N}:])/iu;
const HARDWARE = /(?<![\p{L}\p{N}:])[0-9a-f]{2}(?::[0-9a-f]{2}){5}(?![\p{L}\p{N}:])/iu;

// ---- Private list ---------------------------------------------------------------------------
type Entry = { plain: string; folded: string; bare: string };
type Matcher = Entry[];

function fold(text: string): string {
  return text
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/\s+/gu, " ");
}

function bare(text: string): string {
  return fold(text).replace(/[^\p{L}\p{N}]+/gu, "");
}

function matchesLine(matcher: Matcher, line: string): boolean {
  const lower = line.toLowerCase();
  const folded = fold(line);
  const stripped = bare(line);
  return matcher.some(
    (e) =>
      lower.includes(e.plain) ||
      folded.includes(e.folded) ||
      (e.bare !== "" && stripped.includes(e.bare)),
  );
}

function matchesText(matcher: Matcher, text: string): boolean {
  const folded = fold(text);
  const stripped = bare(text);
  return matcher.some(
    (e) => folded.includes(e.folded) || (e.bare !== "" && stripped.includes(e.bare)),
  );
}

// ---- Problems ------------------------------------------------------------------------------
type Problem = { where: string; what: string };

class GuardError extends Error {}

class Report {
  readonly problems: Problem[] = [];
  private seen = new Set<string>();
  add(where: string, what: string): void {
    const key = `${where}\0${what}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.problems.push({ where, what });
  }
}

const HOME = "matches a home-directory path";
const ADDRESS = "matches a private network address";
const PRIVATE = "matches a line of the private list";

// The rules for one line of text. A line with NUL bytes (UTF-16 seen through --text) is
// also read with them removed. `privateList` is null where the list does not apply.
function lineProblems(line: string, matcher: Matcher | null): string[] {
  const texts = line.includes("\0") ? [line, line.replace(/\0/g, "")] : [line];
  const found = new Set<string>();
  for (const text of texts) {
    if (hasHomePath(text)) found.add(HOME);
    if (PRIVATE_IPV4.test(text) || LOCAL_IPV6.test(text)) found.add(ADDRESS);
    if (HARDWARE.test(text)) found.add("matches a hardware address");
    if (matcher && matchesLine(matcher, text)) found.add(PRIVATE);
  }
  return [...found];
}

// Checks a text line by line, then as a whole for a private-list entry broken across lines
// or spelled differently. `where(n)` names line n; `whole` names the text.
function checkText(
  text: string,
  where: (line: number) => string,
  whole: string,
  matcher: Matcher | null,
  report: Report,
): void {
  let privateHit = false;
  text.split(/\r?\n/).forEach((line, index) => {
    for (const what of lineProblems(line, matcher)) {
      if (what === PRIVATE) privateHit = true;
      report.add(where(index + 1), what);
    }
  });
  if (matcher && !privateHit) {
    const texts = text.includes("\0") ? [text, text.replace(/\0/g, "")] : [text];
    if (texts.some((t) => matchesText(matcher, t))) report.add(whole, PRIVATE);
  }
}

function checkName(
  name: string,
  where: string,
  label: string,
  matcher: Matcher | null,
  report: Report,
) {
  for (const what of lineProblems(name, matcher)) report.add(where, `${label} ${what}`);
}

function checkPath(path: string, where: string, matcher: Matcher | null, report: Report) {
  for (const what of lineProblems(path, matcher)) report.add(where, `path ${what}`);
}

// ---- Lists kept outside the repository ------------------------------------------------------
function listPath(variable: string, name: string): string {
  return process.env[variable] || join(homedir(), ".config/frontend-lab", name);
}

async function readList(
  variable: string,
  name: string,
  label: string,
  required: boolean,
) {
  const file = listPath(variable, name);
  if (!existsSync(file)) {
    if (!required) return null;
    throw new GuardError(
      `the ${label} is missing. Set ${variable} to its file, or create ` +
        `~/.config/frontend-lab/${name}. Push refused.`,
    );
  }
  const lines = (await readFile(file, "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
  if (lines.length === 0 && required) {
    throw new GuardError(`the ${label} has no entry. Push refused.`);
  }
  return lines;
}

async function readMatcher(required: boolean): Promise<Matcher | null> {
  const lines = await readList(PATTERNS_ENV, "guard-patterns", "private list", required);
  if (!lines || lines.length === 0) return null;
  return lines.map((line) => ({
    plain: line.toLowerCase(),
    folded: fold(line).trim(),
    bare: bare(line),
  }));
}

async function readIdentities(): Promise<Set<string>> {
  const lines = await readList(IDENTITY_ENV, "guard-identity", "identity list", true);
  return new Set((lines ?? []).map((line) => line.toLowerCase()));
}

// ---- git ----------------------------------------------------------------------------------
function git(repo: string, args: string[]): string {
  return execFileSync("git", ["-C", repo, "-c", "core.quotePath=false", ...args], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitBuffer(repo: string, args: string[]): Buffer {
  return execFileSync("git", ["-C", repo, ...args], {
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function objectType(repo: string, sha: string): string | null {
  try {
    return git(repo, ["cat-file", "-t", sha]).trim();
  } catch {
    return null;
  }
}

// A commit or tag object: header fields, then the message after the first blank line.
function parseObject(raw: string): { headers: Map<string, string[]>; message: string } {
  const split = raw.indexOf("\n\n");
  const head = split < 0 ? raw : raw.slice(0, split);
  const message = split < 0 ? "" : raw.slice(split + 2);
  const headers = new Map<string, string[]>();
  for (const line of head.split("\n")) {
    if (line.startsWith(" ")) continue;
    const space = line.indexOf(" ");
    const key = line.slice(0, space);
    headers.set(key, [...(headers.get(key) ?? []), line.slice(space + 1)]);
  }
  return { headers, message };
}

function emailOf(person: string | undefined): string {
  return /<([^>]*)>/.exec(person ?? "")?.[1]?.toLowerCase() ?? "";
}

// ---- gitleaks -----------------------------------------------------------------------------
function requireGitleaks(): void {
  const probe = spawnSync("gitleaks", ["version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    throw new GuardError(
      "gitleaks is not installed or does not run; install gitleaks 8.30.1 and try again",
    );
  }
}

type GitleaksFinding = {
  File: string;
  StartLine: number;
  RuleID: string;
  Commit?: string;
};

// Runs gitleaks with its own default rules only: a configuration written here, inline allow
// comments ignored, no ignore file or configuration read from the scanned tree or the
// environment. Findings are redacted and reported by file and line only.
async function gitleaks(
  args: string[],
  report: Report,
  strip = "",
  label = "",
): Promise<void> {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "frontend-lab-gitleaks-")));
  const out = join(dir, "report.json");
  const config = join(dir, "gitleaks.toml");
  const ignore = join(dir, "ignore");
  try {
    await writeFile(config, "[extend]\nuseDefault = true\n");
    await mkdir(ignore);
    const env = { ...process.env };
    delete env.GITLEAKS_CONFIG;
    delete env.GITLEAKS_CONFIG_TOML;
    const result = spawnSync(
      "gitleaks",
      [
        ...args,
        "--config",
        config,
        "--ignore-gitleaks-allow",
        "--gitleaks-ignore-path",
        ignore,
        "--no-banner",
        "--redact",
        "--log-level",
        "error",
        "--report-format",
        "json",
        "--report-path",
        out,
        "--exit-code",
        "0",
      ],
      { cwd: ignore, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (result.status !== 0 || !existsSync(out)) {
      throw new GuardError(`gitleaks failed to run: ${(result.stderr || "").trim()}`);
    }
    const findings = JSON.parse(await readFile(out, "utf8")) as GitleaksFinding[] | null;
    for (const finding of findings ?? []) {
      const file =
        strip && finding.File.startsWith(strip)
          ? realName(finding.File.slice(strip.length))
          : finding.File;
      const commit = finding.Commit ? `commit ${finding.Commit.slice(0, 10)} ` : "";
      report.add(
        `${commit}${label}${file}:${finding.StartLine}`,
        `gitleaks: ${finding.RuleID}`,
      );
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// gitleaks reads `.gitleaksignore` from the folder it scans, whatever --gitleaks-ignore-path
// says. In the commit modes it is therefore given the git directory, where no committed file
// lies; in the working-tree mode an ignore file is copied under another name.
function gitDir(repo: string): string {
  return git(repo, ["rev-parse", "--absolute-git-dir"]).trim();
}

const IGNORE_FILE = /(^|\/)\.gitleaksignore$/;
const RENAMED = ".gitleaksignore.guard-scanned";
function scanName(path: string): string {
  return path.replace(IGNORE_FILE, `$1${RENAMED}`);
}
function realName(path: string): string {
  return path.endsWith(RENAMED)
    ? path.slice(0, -RENAMED.length) + ".gitleaksignore"
    : path;
}

// ---- Working tree -------------------------------------------------------------------------
function decode(buffer: Buffer): string[] {
  const texts = [buffer.toString("utf8")];
  if (buffer.includes(0)) {
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      const swapped = Buffer.from(buffer.subarray(2));
      swapped.swap16();
      texts.push(swapped.toString("utf16le"));
    } else if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      texts.push(buffer.subarray(2).toString("utf16le"));
    } else {
      texts.push(buffer.toString("utf16le"), buffer.subarray(1).toString("utf16le"));
    }
    texts.push(buffer.toString("latin1").replace(/\0/g, ""));
  } else if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    texts.push(buffer.subarray(2).toString("utf16le"));
  }
  return texts;
}

function checkBuffer(
  buffer: Buffer,
  label: string,
  path: string,
  matcher: Matcher | null,
  report: Report,
): void {
  const list = EXEMPT_FROM_PRIVATE_LIST.has(path) ? null : matcher;
  for (const text of decode(buffer)) {
    checkText(text, (n) => `${label}:${n}`, label, list, report);
  }
}

async function checkWorkingTree(repo: string, report: Report): Promise<void> {
  if (!process.env.CI) {
    let hooks: string;
    try {
      hooks = git(repo, ["config", "--get", "core.hooksPath"]).trim();
    } catch {
      hooks = ""; // not set
    }
    if (hooks !== ".githooks") {
      throw new GuardError(
        "the pre-push hook is not turned on in this clone: run `git config core.hooksPath .githooks`",
      );
    }
  }
  const matcher = await readMatcher(false);
  const files = git(repo, [
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
  ])
    .split("\0")
    .filter(Boolean);
  const copy = await realpath(await mkdtemp(join(tmpdir(), "frontend-lab-guard-")));
  const staged = await realpath(await mkdtemp(join(tmpdir(), "frontend-lab-staged-")));
  let stagedCount = 0;
  try {
    for (const path of [...new Set(files)].sort()) {
      const clean = path.replace(/\/$/, "");
      checkPath(clean, clean, matcher, report);
      const full = join(repo, clean);
      let info;
      try {
        info = await lstat(full);
      } catch {
        continue;
      }
      let buffer: Buffer;
      if (info.isSymbolicLink()) {
        const target = await readlink(full);
        for (const what of lineProblems(target, matcher)) {
          report.add(clean, `link target ${what}`);
        }
        buffer = Buffer.from(`${target}\n`);
      } else if (info.isFile()) {
        buffer = await readFile(full);
        checkBuffer(buffer, clean, clean, matcher, report);
      } else {
        continue;
      }
      await mkdir(dirname(join(copy, clean)), { recursive: true });
      await writeFile(join(copy, scanName(clean)), buffer);
    }

    // Staged content that differs from the file on disk is checked as it is in the index.
    const changed = git(repo, ["diff", "--name-only", "-z", "--no-renames"])
      .split("\0")
      .filter(Boolean);
    for (const path of changed) {
      let buffer: Buffer;
      try {
        buffer = gitBuffer(repo, ["cat-file", "blob", `:${path}`]);
      } catch {
        continue;
      }
      checkBuffer(buffer, `(staged) ${path}`, path, matcher, report);
      await mkdir(dirname(join(staged, path)), { recursive: true });
      await writeFile(join(staged, scanName(path)), buffer);
      stagedCount += 1;
    }

    await gitleaks(["dir", copy], report, `${copy}/`);
    if (stagedCount > 0)
      await gitleaks(["dir", staged], report, `${staged}/`, "(staged) ");
  } finally {
    await rm(copy, { recursive: true, force: true });
    await rm(staged, { recursive: true, force: true });
  }
}

// ---- Commits ------------------------------------------------------------------------------
function checkCommits(
  repo: string,
  commits: string[],
  matcher: Matcher | null,
  identities: Set<string> | null,
  report: Report,
): void {
  for (const sha of commits) {
    const short = sha.slice(0, 10);
    const { headers, message } = parseObject(git(repo, ["cat-file", "commit", sha]));
    if (identities) {
      for (const role of ["author", "committer"]) {
        if (!identities.has(emailOf(headers.get(role)?.[0]))) {
          report.add(`commit ${short}`, `${role} e-mail is not an allowed identity`);
        }
      }
    }
    checkText(
      message,
      (n) => `commit ${short} message line ${n}`,
      `commit ${short} message`,
      matcher,
      report,
    );

    const parent = headers.get("parent")?.[0];
    const trees = parent ? [parent, sha] : ["--root", sha];
    const touched = git(repo, [
      "diff-tree",
      "-r",
      "-z",
      "--no-commit-id",
      "--name-only",
      "--no-renames",
      "--diff-filter=d",
      ...trees,
    ])
      .split("\0")
      .filter(Boolean);
    for (const path of touched)
      checkPath(path, `commit ${short} ${path}`, matcher, report);

    const diff = git(repo, ["diff-tree", ...DIFF_FLAGS, ...trees]);
    const added = new Map<string, string[]>();
    let path: string | null = null;
    let lineNo = 0;
    let inHeader = false;
    for (const line of diff.split("\n")) {
      if (line.startsWith("diff --git ")) {
        inHeader = true;
        path = null;
        continue;
      }
      if (inHeader) {
        if (line.startsWith("+++ ")) {
          const target = line.slice(4);
          path = target === "/dev/null" ? null : target.replace(/^b\//, "");
        }
        if (!line.startsWith("@@")) continue;
        inHeader = false;
      }
      const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (hunk) {
        lineNo = Number(hunk[1]);
        continue;
      }
      if (line.startsWith("+") && path) {
        const list = EXEMPT_FROM_PRIVATE_LIST.has(path) ? null : matcher;
        const text = line.slice(1);
        for (const what of lineProblems(text, list)) {
          report.add(`commit ${short} ${path}:${lineNo}`, what);
        }
        added.set(path, [...(added.get(path) ?? []), text]);
        lineNo += 1;
      }
    }
    if (matcher) {
      for (const [file, lines] of added) {
        if (EXEMPT_FROM_PRIVATE_LIST.has(file)) continue;
        const already = report.problems.some(
          (p) => p.what === PRIVATE && p.where.startsWith(`commit ${short} ${file}:`),
        );
        if (already) continue;
        const text = lines.join("\n");
        const texts = text.includes("\0") ? [text, text.replace(/\0/g, "")] : [text];
        if (texts.some((t) => matchesText(matcher, t))) {
          report.add(`commit ${short} ${file}`, PRIVATE);
        }
      }
    }
  }
}

// ---- Modes --------------------------------------------------------------------------------
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

// What the remote advertises, or null when it cannot be asked.
function advertised(repo: string, remote: string): string[] | null {
  try {
    return git(repo, ["ls-remote", remote])
      .split("\n")
      .map((line) => line.split("\t")[0] ?? "")
      .filter((sha) => /^[0-9a-f]{40,64}$/.test(sha));
  } catch {
    return null;
  }
}

async function checkPrePush(
  repo: string,
  remoteName: string,
  remoteUrl: string,
  report: Report,
): Promise<void> {
  const matcher = await readMatcher(true);
  const identities = await readIdentities();
  const input = await readStdin();
  let known: string[] | null | undefined;
  const lines = input.split("\n").filter((line) => line.trim() !== "");
  for (const [index, line] of lines.entries()) {
    const at = `push line ${index + 1}`;
    const [localRef = "", localSha = "", remoteRef = "", remoteSha = ""] = line
      .trim()
      .split(/\s+/);
    if (!localSha || ZERO.test(localSha)) continue;
    checkName(localRef, at, "local ref name", matcher, report);
    checkName(remoteRef, at, "remote ref name", matcher, report);

    // Peel tags, checking each tag's name, message and tagger.
    let object = localSha;
    let type = objectType(repo, object);
    while (type === "tag") {
      const short = object.slice(0, 10);
      const { headers, message } = parseObject(git(repo, ["cat-file", "tag", object]));
      if (!identities.has(emailOf(headers.get("tagger")?.[0]))) {
        report.add(`tag ${short}`, "tagger e-mail is not an allowed identity");
      }
      checkName(headers.get("tag")?.[0] ?? "", `tag ${short}`, "name", matcher, report);
      checkText(
        message,
        (n) => `tag ${short} message line ${n}`,
        `tag ${short} message`,
        matcher,
        report,
      );
      object = headers.get("object")?.[0] ?? "";
      type = objectType(repo, object);
    }
    if (type !== "commit") {
      report.add(at, `the ref points at a ${type ?? "missing object"}; refused`);
      continue;
    }

    let exclude: string[];
    if (!ZERO.test(remoteSha) && objectType(repo, remoteSha) !== null) {
      exclude = [remoteSha];
    } else {
      if (known === undefined) known = advertised(repo, remoteUrl || remoteName);
      exclude = (known ?? []).filter((sha) => objectType(repo, sha) !== null);
    }
    const range = exclude.length > 0 ? [object, "--not", ...exclude] : [object];
    const commits = git(repo, ["rev-list", ...range])
      .split("\n")
      .filter(Boolean);
    if (commits.length === 0) continue;
    checkCommits(repo, commits, matcher, identities, report);
    await gitleaks(
      ["git", gitDir(repo), `--log-opts=${GITLEAKS_LOG_OPTS} ${range.join(" ")}`],
      report,
    );
  }
}

async function checkHistory(repo: string, report: Report): Promise<void> {
  let commits: string[];
  try {
    commits = git(repo, ["rev-list", "--all"]).split("\n").filter(Boolean);
  } catch {
    commits = []; // no commit yet
  }
  if (commits.length === 0) return;
  checkCommits(repo, commits, null, null, report);
  await gitleaks(["git", gitDir(repo), `--log-opts=${GITLEAKS_LOG_OPTS} --all`], report);
}

async function main(): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        "pre-push": { type: "boolean", default: false },
        ci: { type: "boolean", default: false },
        repo: { type: "string" },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    process.stderr.write(`guard: ${(error as Error).message}\n${USAGE}\n`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values["pre-push"] && values.ci) {
    process.stderr.write(`guard: --pre-push and --ci are separate modes\n${USAGE}\n`);
    return 2;
  }
  if (!values["pre-push"] && positionals.length > 0) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let repo: string;
  try {
    repo = git(resolve(values.repo ?? "."), ["rev-parse", "--show-toplevel"]).trim();
  } catch {
    process.stderr.write("guard: not inside a git repository\n");
    return 2;
  }

  const report = new Report();
  const mode = values["pre-push"] ? "pre-push" : values.ci ? "ci" : "tree";
  try {
    requireGitleaks();
    if (mode === "pre-push") {
      await checkPrePush(repo, positionals[0] ?? "origin", positionals[1] ?? "", report);
    } else if (mode === "ci") {
      await checkHistory(repo, report);
    } else {
      await checkWorkingTree(repo, report);
    }
  } catch (error) {
    if (error instanceof GuardError) {
      process.stderr.write(`guard: ${error.message}\n`);
      return 2;
    }
    throw error;
  }

  for (const problem of report.problems) {
    process.stdout.write(`${problem.where}: ${problem.what}\n`);
  }
  if (report.problems.length > 0) {
    process.stdout.write(
      `guard (${mode}): ${report.problems.length} problem(s); nothing may leave.\n`,
    );
    return 1;
  }
  process.stdout.write(`guard (${mode}): clean\n`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`guard: ${(error as Error).stack ?? String(error)}\n`);
    process.exit(2);
  },
);
