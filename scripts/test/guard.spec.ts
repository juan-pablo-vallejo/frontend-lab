import { expect, test } from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { removeTempDirs, repoRoot, runScript, tempDir } from "./helpers.ts";

test.afterAll(removeTempDirs);

// Every forbidden shape is assembled at run time, so this file passes the guard itself.
const S = "/";
const B = "\\";
const HOME_PATH = ["", "Users", "someone", "notes", "plan.md"].join(S);
const LINUX_HOME_PATH = ["", "home", "someone", "work"].join(S);
const PRIVATE_ADDRESS = ["192", "168", "4", "20"].join(".");
const OTHER_PRIVATE_ADDRESS = ["172", "20", "0", "9"].join(".");
const PRIVATE_STRING = ["orchid", "lantern", "4471"].join("-");
const MULTI_WORD = ["Blue", "Heron", "Works"].join(" ");
const ACCENTED = ["Café", "Lumière"].join(" ");
const IDENTITY = "test@example.invalid";
const STRANGER = ["someone", "example.org"].join("@");
const ZERO = "0".repeat(40);

const GIT_IDENTITY = [
  "-c",
  "commit.gpgsign=false",
  "-c",
  "tag.gpgsign=false",
  "-c",
  "user.name=test",
  "-c",
  `user.email=${IDENTITY}`,
];

function git(dir: string, ...args: string[]): string {
  return execFileSync("git", [...GIT_IDENTITY, ...args], {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function token(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return (
    "gh" +
    "p_" +
    Array.from(randomBytes(36), (b) => alphabet[b % alphabet.length]).join("")
  );
}

type Repo = {
  dir: string;
  remote: string;
  base: string;
  patterns: string;
  identity: string;
};

async function repo(start: Record<string, string> = {}): Promise<Repo> {
  const base = await tempDir("guard");
  const dir = join(base, "work");
  const remote = join(base, "remote.git");
  const patterns = join(base, "guard-patterns");
  const identity = join(base, "guard-identity");
  await mkdir(dir);
  await writeFile(
    patterns,
    `# private strings\n\n${PRIVATE_STRING}\n${MULTI_WORD}\n${ACCENTED}\n`,
  );
  await writeFile(identity, `# allowed\n${IDENTITY}\n`);
  execFileSync("git", ["init", "--bare", "-q", "-b", "main", remote]);
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "core.hooksPath", ".githooks");
  git(dir, "remote", "add", "origin", remote);
  await commit(
    dir,
    { "README.md": "A clean start.\n", LICENSE: "Licence text.\n", ...start },
    "Start",
  );
  git(dir, "push", "-q", "origin", "main");
  return { dir, remote, base, patterns, identity };
}

async function commit(dir: string, files: Record<string, string>, message: string) {
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), text);
  }
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--allow-empty", "-m", message);
  return git(dir, "rev-parse", "HEAD");
}

function env(r: Repo, extra: Record<string, string | undefined> = {}) {
  return {
    FRONTEND_LAB_GUARD_PATTERNS: r.patterns,
    FRONTEND_LAB_GUARD_IDENTITY: r.identity,
    CI: undefined,
    ...extra,
  };
}

// What git hands the pre-push hook on standard input for a push of main.
function prePushInput(r: Repo, newBranch = false): string {
  const local = git(r.dir, "rev-parse", "HEAD");
  const remote = newBranch ? ZERO : git(r.dir, "rev-parse", "origin/main");
  return `refs/heads/main ${local} refs/heads/main ${remote}\n`;
}

function prePush(
  r: Repo,
  extra: Record<string, string | undefined> = {},
  input = prePushInput(r),
) {
  return runScript("guard", ["--pre-push", "origin", r.remote], {
    cwd: r.dir,
    input,
    env: env(r, extra),
  });
}

function tree(r: Repo, extra: Record<string, string | undefined> = {}) {
  return runScript("guard", [], { cwd: r.dir, env: env(r, extra) });
}

function ci(r: Repo) {
  return runScript("guard", ["--ci"], { cwd: r.dir, env: env(r, { CI: "true" }) });
}

test("a clean repository passes in every mode", async () => {
  const r = await repo();
  await commit(r.dir, { "docs/a.md": "Nothing private here.\n" }, "Add a note");
  const push = await prePush(r);
  expect(push.code, push.stdout + push.stderr).toBe(0);
  const t = await tree(r);
  expect(t.code, t.stdout + t.stderr).toBe(0);
  const c = await ci(r);
  expect(c.code, c.stdout + c.stderr).toBe(0);
});

test("a commit adding a home-directory path is refused", async () => {
  const r = await repo();
  await commit(r.dir, { "notes.md": `See ${HOME_PATH} for more.\n` }, "Add notes");
  const result = await prePush(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain("notes.md:1");
  expect(result.stdout).toContain("home-directory path");
  expect(result.stdout).not.toContain(HOME_PATH);
});

test("the Linux form of a home-directory path is refused too, also in a commit message", async () => {
  const r = await repo();
  await commit(r.dir, { "a.txt": "fine\n" }, `Copied from ${LINUX_HOME_PATH}`);
  const result = await prePush(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain("message line 1");
});

test("a commit adding a private network address is refused", async () => {
  const r = await repo();
  await commit(
    r.dir,
    { "config/hosts.txt": `box ${PRIVATE_ADDRESS}\nother ${OTHER_PRIVATE_ADDRESS}\n` },
    "Add hosts",
  );
  const result = await prePush(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain("config/hosts.txt:1");
  expect(result.stdout).toContain("config/hosts.txt:2");
  expect(result.stdout).toContain("private network address");
});

test("loopback is allowed", async () => {
  const r = await repo();
  await commit(
    r.dir,
    { "a.txt": `serve on ${["127", "0", "0", "1"].join(".")}:3000\n` },
    "Add",
  );
  const result = await prePush(r);
  expect(result.code, result.stdout).toBe(0);
});

test("a commit containing a line of the private list is refused without printing it", async () => {
  const r = await repo();
  await commit(
    r.dir,
    { "docs/b.md": `Made for ${PRIVATE_STRING.toUpperCase()}.\n` },
    "Add b",
  );
  const result = await prePush(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain("docs/b.md:1");
  expect(result.stdout).toContain("private list");
  expect((result.stdout + result.stderr).toLowerCase()).not.toContain(PRIVATE_STRING);
});

test("the same private string inside LICENSE passes", async () => {
  const r = await repo();
  await commit(r.dir, { LICENSE: `Copyright ${PRIVATE_STRING}.\n` }, "Licence");
  const result = await prePush(r);
  expect(result.code, result.stdout).toBe(0);
  const t = await tree(r);
  expect(t.code, t.stdout).toBe(0);
});

test("the working tree check applies the private list when it exists", async () => {
  const r = await repo();
  await writeFile(join(r.dir, "draft.md"), `${PRIVATE_STRING}\n`);
  const result = await tree(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain("draft.md:1");
  expect(result.stdout.toLowerCase()).not.toContain(PRIVATE_STRING);
});

test("a missing private list refuses a push", async () => {
  const r = await repo();
  await commit(r.dir, { "c.md": "clean\n" }, "Add c");
  const result = await prePush(r, {
    FRONTEND_LAB_GUARD_PATTERNS: join(r.dir, "no-such-file"),
  });
  expect(result.code).not.toBe(0);
  expect(result.stderr).toContain("private list");
});

test("M1: an empty or comment-only private list refuses a push", async () => {
  const r = await repo();
  await commit(r.dir, { "c.md": `${PRIVATE_STRING}\n` }, "Add c");
  for (const text of ["", "# only a comment\n\n"]) {
    const list = join(r.base, "empty-list");
    await writeFile(list, text);
    const result = await prePush(r, { FRONTEND_LAB_GUARD_PATTERNS: list });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("private list has no entry");
  }
});

test("M6: a new branch is checked on every commit not already on the remote", async () => {
  // The commit already on the remote holds a violation; it must not be reported.
  const r = await repo({ "old.md": `${HOME_PATH}\n` });
  git(r.dir, "checkout", "-q", "-b", "topic");
  await commit(r.dir, { "d.md": `${HOME_PATH}\n` }, "Bad");
  await commit(r.dir, { "e.md": "fine\n" }, "Good");
  const local = git(r.dir, "rev-parse", "HEAD");
  const result = await prePush(
    r,
    {},
    `refs/heads/topic ${local} refs/heads/topic ${ZERO}\n`,
  );
  expect(result.code).toBe(1);
  expect(result.stdout).toContain("d.md:1");
  expect(result.stdout).not.toContain("old.md");
});

test("a secret that gitleaks recognises is refused", async () => {
  const r = await repo();
  const secret = token();
  await commit(r.dir, { "deploy.env": `TOKEN=${secret}\n` }, "Add deploy settings");
  const result = await prePush(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain("gitleaks");
  expect(result.stdout).toContain("deploy.env");
  expect(result.stdout + result.stderr).not.toContain(secret);
});

test("M6: the hook refuses a bad push with the guard's message and lets a clean one through", async () => {
  const r = await repo();
  git(r.dir, "config", "core.hooksPath", join(repoRoot, ".githooks"));
  const push = () =>
    spawnSync("git", ["push", "-q", "origin", "main"], {
      cwd: r.dir,
      env: {
        ...process.env,
        FRONTEND_LAB_GUARD_PATTERNS: r.patterns,
        FRONTEND_LAB_GUARD_IDENTITY: r.identity,
      },
      encoding: "utf8",
    });
  await commit(r.dir, { "ok.md": "clean\n" }, "Clean");
  const clean = push();
  expect(clean.status, clean.stderr).toBe(0);
  expect(git(r.dir, "rev-parse", "origin/main")).toBe(git(r.dir, "rev-parse", "HEAD"));

  await commit(r.dir, { "f.md": `${PRIVATE_ADDRESS}\n` }, "Add f");
  const bad = push();
  expect(bad.status).not.toBe(0);
  expect(bad.stdout + bad.stderr).toContain("f.md:1: matches a private network address");
  expect(git(r.dir, "rev-parse", "origin/main")).not.toBe(
    git(r.dir, "rev-parse", "HEAD"),
  );
});

test("--ci checks the whole history without the private list", async () => {
  const r = await repo();
  await commit(r.dir, { "g.md": `${PRIVATE_STRING}\n` }, "Private string, allowed in CI");
  const passing = await ci(r);
  expect(passing.code, passing.stdout).toBe(0);
  await commit(r.dir, { "h.md": `${HOME_PATH}\n` }, "Add h");
  await commit(r.dir, { "h.md": "removed\n" }, "Remove it again");
  const failing = await ci(r);
  expect(failing.code).toBe(1);
  expect(failing.stdout).toContain("h.md:1");
});

test("the repository itself passes", async () => {
  const result = await runScript("guard", [], { cwd: repoRoot });
  expect(result.code, result.stdout + result.stderr).toBe(0);
});

// The output names the offending path, which holds the string; nothing else may show it.
function withoutPath(output: string, path: string): string {
  return output.split(path).join("").toLowerCase();
}

test("a file whose name contains a private-list string is refused in tree mode", async () => {
  const r = await repo();
  const path = `notes/${PRIVATE_STRING}-plan.md`;
  await mkdir(join(r.dir, "notes"), { recursive: true });
  await writeFile(join(r.dir, path), "Nothing private inside.\n");
  const result = await tree(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain(`${path}: path matches a line of the private list`);
  expect(withoutPath(result.stdout + result.stderr, path)).not.toContain(PRIVATE_STRING);
});

test("a file whose name contains a private-list string is refused on push", async () => {
  const r = await repo();
  const path = `docs/${PRIVATE_STRING}.md`;
  await commit(r.dir, { [path]: "Nothing private inside.\n" }, "Add a doc");
  const result = await prePush(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain(`${path}: path matches a line of the private list`);
  expect(withoutPath(result.stdout + result.stderr, path)).not.toContain(PRIVATE_STRING);
});

test("a renamed file is checked under its new name, and an empty file's name too", async () => {
  const r = await repo();
  await commit(r.dir, { "plain.md": "text\n" }, "Add plain");
  git(r.dir, "push", "-q", "origin", "main");
  git(r.dir, "mv", "plain.md", `${PRIVATE_STRING}.md`);
  await commit(r.dir, { [`hosts/${PRIVATE_ADDRESS}/empty.txt`]: "" }, "Rename and add");
  const result = await prePush(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain(
    `${PRIVATE_STRING}.md: path matches a line of the private list`,
  );
  expect(result.stdout).toContain("empty.txt: path matches a private network address");
});

// I7: shapes of a home-directory path that tools write, and three that are not one.
const homeShapes: [string, string, boolean][] = [
  ["the second entry of a PATH list", `PATH=/usr/bin:${HOME_PATH}`, true],
  ["an scp or rsync target", `rsync -a dist/ box:${LINUX_HOME_PATH}/site`, true],
  ["a key followed by a path", `notes:${HOME_PATH}`, true],
  ["an option glued to the path (-I)", `cc -I${HOME_PATH}`, true],
  ["an option glued to the path (-L)", `ld -L${LINUX_HOME_PATH}`, true],
  ["an option glued to the path (-C)", `git -C${HOME_PATH} status`, true],
  ["the macOS data volume", `${S}System${S}Volumes${S}Data${HOME_PATH}`, true],
  ["another volume", `${S}Volumes${S}Disk2${HOME_PATH}`, true],
  ["the WSL form", `${S}mnt${S}c${S}Users${S}someone${S}x`, true],
  ["the Git-Bash form", `${S}c${S}Users${S}someone${S}x`, true],
  ["the Windows backslash form", `C:${B}Users${B}someone${B}x`, true],
  ["a JSON-escaped Windows path", `"C:${B}${B}Users${B}${B}someone"`, true],
  ["after an escaped newline in JSON", `"line one${B}n${HOME_PATH}"`, true],
  ["after an escaped tab in JSON", `"a${B}t${LINUX_HOME_PATH}"`, true],
  ["JSON-escaped slashes", `"${B}${S}Users${B}${S}someone${B}${S}x"`, true],
  ["a URL-encoded path", `?file=${["", "Users", "someone", "x"].join("%2F")}`, true],
  ["file://localhost in front", `file:${S}${S}localhost${HOME_PATH}`, true],
  ["file:// in front", `file:${S}${S}${HOME_PATH}`, true],
  ["an editor deep link", `vscode:${S}${S}file${HOME_PATH}:12`, true],
  ["a lower-case root folder", `${S}users${S}someone${S}x`, true],
  ["root's home", `${S}root${S}.profile`, true],
  ["/var/home", `${S}var${LINUX_HOME_PATH}`, true],
  ["/export/home", `${S}export${LINUX_HOME_PATH}`, true],
  ["a double slash", `${S}${HOME_PATH}`, true],
  ["a user name starting with a non-ASCII letter", `${S}Users${S}Ñame${S}x`, true],
  ["a web route under /home", `"path": "${S}home${S}overview"`, true],
  ["a URL path", `https://example.org${S}home${S}page`, false],
  ["a relative path", `docs${S}home${S}x`, false],
  ["a path under ~", `~${S}home${S}x`, false],
];

test("I7: home-path shapes", async () => {
  const r = await repo();
  const files: Record<string, string> = {};
  homeShapes.forEach(([, line], index) => {
    files[`shapes/${String(index).padStart(2, "0")}.txt`] = `${line}\n`;
  });
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(r.dir, path)), { recursive: true });
    await writeFile(join(r.dir, path), text);
  }
  const result = await tree(r);
  homeShapes.forEach(([what, , flagged], index) => {
    const line = `shapes/${String(index).padStart(2, "0")}.txt:1: matches a home-directory path`;
    if (flagged) expect(result.stdout, what).toContain(line);
    else expect(result.stdout, what).not.toContain(line);
  });
});

// M5: addresses and names of machines.
const addressShapes: [string, string, boolean][] = [
  ["link-local IPv4", ["169", "254", "10", "3"].join("."), true],
  ["carrier-grade NAT", ["100", "72", "0", "9"].join("."), true],
  ["IPv6 unique-local", ["fd12", "3456", "789a", "", "1"].join(":"), true],
  ["IPv6 link-local", ["fe80", "", "1c2", "3ff"].join(":"), true],
  ["a hardware address", ["a4", "83", "e7", "1f", "0c", "9b"].join(":"), true],
  [
    "a .local name (the private list's job, not this rule)",
    ["build-box", "local"].join("."),
    false,
  ],
  ["DateTime.local()", "const now = DateTime.local();", false],
  ["this.local", "return this.local;", false],
  ["closing tags named root", "<root><a/></root> </Root>", false],
  ["SVG path data", `<path d="M${["10", "5", "2", "3"].join(".")}z"/>`, false],
  ["a settings file name", "settings.local.json", false],
  ["a public address", ["93", "184", "216", "34"].join("."), false],
];

test("M5: address shapes", async () => {
  const r = await repo();
  for (const [index, [, line]] of addressShapes.entries()) {
    await mkdir(join(r.dir, "addr"), { recursive: true });
    await writeFile(join(r.dir, "addr", `${index}.txt`), `x ${line} y\n`);
  }
  const result = await tree(r);
  addressShapes.forEach(([what, , flagged], index) => {
    const reported = result.stdout.includes(`addr/${index}.txt:1:`);
    expect(reported, `${what}\n${result.stdout}`).toBe(flagged);
  });
});

// I8: a private-list entry hidden by layout or spelling.
const listShapes: [string, string][] = [
  ["wrapped over a line break", `A line that ends with Blue\nHeron Works and goes on.\n`],
  ["two spaces", "Blue  Heron Works\n"],
  ["a no-break space", "Blue Heron Works\n"],
  ["a hyphen", "blue-heron-works\n"],
  ["an underscore", "BLUE_HERON_WORKS\n"],
  ["no separator", "BlueHeronWorks\n"],
  ["decomposed accents", "Café Lumière\n"],
  ["accents dropped", "Cafe Lumiere\n"],
];

for (const [what, text] of listShapes) {
  test(`I8: a private-list entry with ${what} is refused in tree mode and on push`, async () => {
    const r = await repo();
    await commit(r.dir, { "doc.md": text }, "Add doc");
    const t = await tree(r);
    expect(t.code, t.stdout).toBe(1);
    expect(t.stdout).toMatch(/doc\.md(:\d+)?: matches a line of the private list/);
    const p = await prePush(r);
    expect(p.code, p.stdout).toBe(1);
    expect(p.stdout).toMatch(/doc\.md(:\d+)?: matches a line of the private list/);
  });
}

test("I1: tree mode outside CI refuses a clone whose hook is not turned on", async () => {
  const r = await repo();
  git(r.dir, "config", "--unset", "core.hooksPath");
  const off = await tree(r);
  expect(off.code).toBe(2);
  expect(off.stderr).toContain("git config core.hooksPath .githooks");
  const inCi = await tree(r, { CI: "true" });
  expect(inCi.code, inCi.stderr).toBe(0);
  git(r.dir, "config", "core.hooksPath", ".githooks");
  const on = await tree(r);
  expect(on.code, on.stderr).toBe(0);
});

test("I2: a private string in a branch or tag name is refused without printing it", async () => {
  const r = await repo();
  const sha = await commit(r.dir, { "x.md": "fine\n" }, "Fine");
  const branch = `refs/heads/feature/${PRIVATE_STRING}-header`;
  const b = await prePush(r, {}, `${branch} ${sha} ${branch} ${ZERO}\n`);
  expect(b.code).toBe(1);
  expect(b.stdout).toContain(
    "push line 1: local ref name matches a line of the private list",
  );
  expect((b.stdout + b.stderr).toLowerCase()).not.toContain(PRIVATE_STRING);
  const tag = `refs/tags/${PRIVATE_STRING}`;
  const t = await prePush(r, {}, `${tag} ${sha} ${tag} ${ZERO}\n`);
  expect(t.code).toBe(1);
  expect(t.stdout).toContain("remote ref name matches a line of the private list");
});

test("I2: an annotated tag's message is checked, also through a nested tag", async () => {
  const r = await repo();
  await commit(r.dir, { "x.md": "fine\n" }, "Fine");
  git(r.dir, "tag", "-a", "inner", "-m", `Built in ${HOME_PATH}`);
  git(
    r.dir,
    "-c",
    "advice.nestedTag=false",
    "tag",
    "-a",
    "outer",
    "inner",
    "-m",
    "Release",
  );
  const outer = git(r.dir, "rev-parse", "outer");
  const result = await prePush(
    r,
    {},
    `refs/tags/outer ${outer} refs/tags/outer ${ZERO}\n`,
  );
  expect(result.code).toBe(1);
  expect(result.stdout).toMatch(
    /tag [0-9a-f]{10} message line 1: matches a home-directory path/,
  );
});

test("I2: a tag that points at a blob or a tree is refused", async () => {
  const r = await repo();
  await writeFile(join(r.base, "blob.txt"), `${HOME_PATH}\n`);
  const blob = git(r.dir, "hash-object", "-w", join(r.base, "blob.txt"));
  const b = await prePush(r, {}, `refs/tags/b ${blob} refs/tags/b ${ZERO}\n`);
  expect(b.code).toBe(1);
  expect(b.stdout).toContain("push line 1: the ref points at a blob");
  const treeSha = git(r.dir, "rev-parse", "HEAD^{tree}");
  const t = await prePush(r, {}, `refs/tags/t ${treeSha} refs/tags/t ${ZERO}\n`);
  expect(t.code).toBe(1);
  expect(t.stdout).toContain("push line 1: the ref points at a tree");
});

test("I3: a new ref is checked against what the remote has, not stale tracking refs", async () => {
  const r = await repo();
  await commit(r.dir, { "draft.md": `${PRIVATE_STRING} ${HOME_PATH}\n` }, "Draft");
  git(r.dir, "push", "-q", "origin", "main");
  // origin now points at an empty public remote; refs/remotes/origin/main is stale.
  const fresh = join(r.base, "fresh.git");
  execFileSync("git", ["init", "--bare", "-q", "-b", "main", fresh]);
  git(r.dir, "remote", "set-url", "origin", fresh);
  const local = git(r.dir, "rev-parse", "HEAD");
  const result = await runScript("guard", ["--pre-push", "origin", fresh], {
    cwd: r.dir,
    input: `refs/heads/main ${local} refs/heads/main ${ZERO}\n`,
    env: env(r),
  });
  expect(result.code).toBe(1);
  expect(result.stdout).toContain("draft.md:1");
});

test("I4: author, committer and tagger e-mail must be allowed identities", async () => {
  const r = await repo();
  const sha = execFileSync(
    "git",
    [
      ...GIT_IDENTITY,
      "-c",
      `user.email=${STRANGER}`,
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      "x",
    ],
    { cwd: r.dir, encoding: "utf8" },
  );
  void sha;
  const result = await prePush(r);
  expect(result.code).toBe(1);
  expect(result.stdout).toMatch(
    /commit [0-9a-f]{10}: author e-mail is not an allowed identity/,
  );
  expect(result.stdout).toMatch(
    /commit [0-9a-f]{10}: committer e-mail is not an allowed identity/,
  );
  expect(result.stdout + result.stderr).not.toContain(STRANGER);

  const r2 = await repo();
  execFileSync(
    "git",
    [...GIT_IDENTITY, "-c", `user.email=${STRANGER}`, "tag", "-a", "v1", "-m", "v1"],
    { cwd: r2.dir },
  );
  const tag = git(r2.dir, "rev-parse", "v1");
  const t = await prePush(r2, {}, `refs/tags/v1 ${tag} refs/tags/v1 ${ZERO}\n`);
  expect(t.code).toBe(1);
  expect(t.stdout).toMatch(/tag [0-9a-f]{10}: tagger e-mail is not an allowed identity/);

  const c = await ci(r);
  expect(c.code, c.stdout).toBe(0);
});

test("I4: a missing or empty identity list refuses a push", async () => {
  const r = await repo();
  await commit(r.dir, { "c.md": "clean\n" }, "c");
  const missing = await prePush(r, {
    FRONTEND_LAB_GUARD_IDENTITY: join(r.base, "no-such-file"),
  });
  expect(missing.code).toBe(2);
  expect(missing.stderr).toContain("identity list");
  const empty = join(r.base, "empty-identity");
  await writeFile(empty, "# nobody\n");
  const e = await prePush(r, { FRONTEND_LAB_GUARD_IDENTITY: empty });
  expect(e.code).toBe(2);
  expect(e.stderr).toContain("identity list has no entry");
});

test("I5: a file with a NUL byte or in UTF-16 is still read, in every mode", async () => {
  const r = await repo();
  await writeFile(
    join(r.dir, "bin.dat"),
    Buffer.concat([Buffer.from([0]), Buffer.from(` ${HOME_PATH} ${PRIVATE_ADDRESS}\n`)]),
  );
  const bom = Buffer.from([0xff, 0xfe]);
  await writeFile(
    join(r.dir, "wide.txt"),
    Buffer.concat([bom, Buffer.from(`${PRIVATE_STRING}\n`, "utf16le")]),
  );
  const t = await tree(r);
  expect(t.code).toBe(1);
  expect(t.stdout).toMatch(/bin\.dat(:\d+)?: matches a home-directory path/);
  expect(t.stdout).toMatch(/bin\.dat(:\d+)?: matches a private network address/);
  expect(t.stdout).toMatch(/wide\.txt(:\d+)?: matches a line of the private list/);
  git(r.dir, "add", "-A");
  git(r.dir, "commit", "-q", "-m", "Binary");
  const p = await prePush(r);
  expect(p.stdout).toMatch(/bin\.dat(:\d+)?: matches a home-directory path/);
  expect(p.stdout).toMatch(/wide\.txt(:\d+)?: matches a line of the private list/);
  const c = await ci(r);
  expect(c.stdout).toMatch(/bin\.dat(:\d+)?: matches a home-directory path/);
});

test("I5: a file marked -diff is read in the commit modes, gitleaks included", async () => {
  const r = await repo();
  const secret = token();
  await commit(
    r.dir,
    {
      ".gitattributes": "*.cfg -diff\n",
      "a.cfg": `${HOME_PATH}\n`,
      "b.cfg": `TOKEN=${secret}\n`,
    },
    "Configs",
  );
  const p = await prePush(r);
  expect(p.code).toBe(1);
  expect(p.stdout).toContain("a.cfg:1: matches a home-directory path");
  expect(p.stdout).toMatch(/b\.cfg:1: gitleaks/);
  const c = await ci(r);
  expect(c.stdout).toContain("a.cfg:1: matches a home-directory path");
  expect(c.stdout).toMatch(/b\.cfg:1: gitleaks/);
});

test("I6: a secret added only inside a merge commit is found by gitleaks", async () => {
  const r = await repo();
  git(r.dir, "checkout", "-q", "-b", "side");
  await commit(r.dir, { "side.md": "side\n" }, "Side");
  git(r.dir, "checkout", "-q", "main");
  await commit(r.dir, { "main.md": "main\n" }, "Main");
  git(r.dir, "merge", "-q", "--no-commit", "--no-ff", "side");
  await writeFile(join(r.dir, "merged.env"), `TOKEN=${token()}\n`);
  git(r.dir, "add", "-A");
  git(r.dir, "commit", "-q", "-m", "Merge side");
  const p = await prePush(r);
  expect(p.code).toBe(1);
  expect(p.stdout).toMatch(/merged\.env:1: gitleaks/);
  const c = await ci(r);
  expect(c.stdout).toMatch(/merged\.env:1: gitleaks/);
});

test("M2: the repository cannot switch gitleaks off", async () => {
  const r = await repo();
  const allowAll = '[allowlist]\npaths = [".*"]\n';
  await writeFile(join(r.base, "allow.toml"), allowAll);
  await commit(
    r.dir,
    {
      ".gitleaks.toml": allowAll,
      ".gitleaksignore": "",
      "inline.env": `TOKEN=${token()} # gitleaks:allow\n`,
      "plain.env": `TOKEN=${token()}\n`,
    },
    "Try to hide tokens",
  );
  const extra = { GITLEAKS_CONFIG: join(r.base, "allow.toml") };
  const t = await tree(r, extra);
  expect(t.stdout).toMatch(/inline\.env:1: gitleaks/);
  expect(t.stdout).toMatch(/plain\.env:1: gitleaks/);
  const p = await prePush(r, extra);
  expect(p.stdout).toMatch(/inline\.env:1: gitleaks/);
  expect(p.stdout).toMatch(/plain\.env:1: gitleaks/);
});

test("M3: the user's git settings do not hide a root commit or the LICENSE prefix", async () => {
  const base = await tempDir("guard-root");
  const r = await repo();
  const dir = join(base, "work");
  await mkdir(dir);
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "log.showRoot", "false");
  git(dir, "config", "diff.noprefix", "true");
  await commit(
    dir,
    { "first.md": `${HOME_PATH}\n`, "b/LICENSE": `${PRIVATE_STRING}\n` },
    "First",
  );
  const sha = git(dir, "rev-parse", "HEAD");
  const result = await runScript(
    "guard",
    ["--pre-push", "origin", join(base, "none.git")],
    {
      cwd: dir,
      input: `refs/heads/main ${sha} refs/heads/main ${ZERO}\n`,
      env: env(r),
    },
  );
  expect(result.code).toBe(1);
  expect(result.stdout).toContain("first.md:1: matches a home-directory path");
  expect(result.stdout).toContain("b/LICENSE:1: matches a line of the private list");
});

test("M4: tree mode reads link targets, skips directories and sees staged content", async () => {
  const r = await repo({ "tracked.md": "clean\n" });
  await symlink(HOME_PATH, join(r.dir, "to-home"));
  await mkdir(join(r.dir, "real-dir"));
  await writeFile(join(r.dir, "real-dir", "f.txt"), "fine\n");
  await symlink("real-dir", join(r.dir, "dir-link"));
  const nested = join(r.dir, "nested");
  await mkdir(nested);
  git(nested, "init", "-q");
  await writeFile(join(nested, "n.txt"), "inner\n");
  await writeFile(join(r.dir, "tracked.md"), `${PRIVATE_STRING}\n`);
  git(r.dir, "add", "tracked.md");
  await writeFile(join(r.dir, "tracked.md"), "clean again\n");
  const result = await tree(r);
  expect(result.code, result.stderr).toBe(1);
  expect(result.stdout).toContain("to-home: link target matches a home-directory path");
  expect(result.stdout).toContain(
    "(staged) tracked.md:1: matches a line of the private list",
  );
  expect(result.stderr).not.toContain("EISDIR");
});

test("M2: a committed .gitleaksignore with a real fingerprint does not silence a finding", async () => {
  const r = await repo();
  await commit(r.dir, { "deploy.env": `TOKEN=${token()}\n` }, "Add token");
  const gitleaks = (mode: string, extra: string[] = []) =>
    spawnSync("gitleaks", [mode, ".", "--no-banner", "--redact", ...extra], {
      cwd: r.dir,
      encoding: "utf8",
    });
  // The fingerprints gitleaks itself gives these findings, in git mode and in dir mode.
  const fingerprints = ["git", "dir"].flatMap((mode) => {
    const run = gitleaks(mode, [
      "--report-format",
      "json",
      "--report-path",
      "-",
      "--exit-code",
      "0",
    ]);
    return (JSON.parse(run.stdout) as { Fingerprint: string }[]).map(
      (f) => f.Fingerprint,
    );
  });
  expect(fingerprints.length).toBeGreaterThanOrEqual(2);
  await commit(r.dir, { ".gitleaksignore": `${fingerprints.join("\n")}\n` }, "Ignore it");
  // gitleaks on its own, reading the committed file, is now silenced in both modes.
  for (const mode of ["git", "dir"]) {
    const direct = gitleaks(mode, ["--exit-code", "7"]);
    expect(direct.status, `${mode}: ${direct.stderr}`).toBe(0);
  }
  const p = await prePush(r);
  expect(p.stdout).toMatch(/deploy\.env:1: gitleaks/);
  const c = await ci(r);
  expect(c.stdout).toMatch(/deploy\.env:1: gitleaks/);
  const t = await tree(r);
  expect(t.stdout).toMatch(/deploy\.env:1: gitleaks/);
});
