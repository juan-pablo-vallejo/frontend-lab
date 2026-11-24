import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { cp, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { removeTempDirs, repoRoot, runScript, tempDir } from "./helpers.ts";

test.afterAll(removeTempDirs);

const ALIAS = "lab-box-example";
const DIR = "work/frontend-lab-test";

function ws(args: string[], overrides: Record<string, string | undefined> = {}) {
  return runScript("ws", ["--print", ...args], {
    env: {
      FRONTEND_LAB_ENV: "/dev/null",
      FRONTEND_LAB_WS_HOST: ALIAS,
      FRONTEND_LAB_WS_DIR: DIR,
      ...overrides,
    },
  });
}

test("scripts/ws parses as POSIX sh", () => {
  const result = spawnSync("sh", ["-n", join(repoRoot, "scripts/ws")], {
    encoding: "utf8",
  });
  expect(result.status, result.stderr).toBe(0);
});

const refusals: [string, Record<string, string | undefined>, string][] = [
  [
    "a missing alias",
    { FRONTEND_LAB_WS_HOST: undefined },
    "FRONTEND_LAB_WS_HOST is not set",
  ],
  [
    "a missing folder",
    { FRONTEND_LAB_WS_DIR: undefined },
    "FRONTEND_LAB_WS_DIR is not set",
  ],
  ["an absolute folder", { FRONTEND_LAB_WS_DIR: "/srv/lab" }, "must be a plain folder"],
  ["a folder with ..", { FRONTEND_LAB_WS_DIR: "work/../lab" }, "must be a plain folder"],
  [
    "an alias with a slash",
    { FRONTEND_LAB_WS_HOST: "box/other" },
    "must be a plain SSH alias",
  ],
];

for (const [what, overrides, message] of refusals) {
  test(`ws refuses ${what}`, async () => {
    const result = await ws(["send"], overrides);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(message);
    expect(result.stdout).toBe("");
  });
}

test("ws send prints the marker check, the rsync of tracked files and the install", async () => {
  const result = await ws(["send"]);
  expect(result.code, result.stderr).toBe(0);
  const lines = result.stdout.trim().split("\n");
  expect(lines).toHaveLength(4);
  const [mark = "", , copy = "", install = ""] = lines;
  expect(mark).toContain(".frontend-lab-ws");
  expect(mark).toContain("was not made by this script");
  expect(copy).toMatch(/^rsync -a --from0 --files-from=\S+ \S+\/ /);
  expect(copy.endsWith(` ${ALIAS}:${DIR}/`)).toBe(true);
  expect(install).toContain(
    "pnpm install --frozen-lockfile && pnpm exec playwright install chromium",
  );
  for (const line of [mark, install]) {
    const words = line.split(" ");
    expect(words.slice(0, 4)).toEqual(["ssh", "-o", "BatchMode=yes", ALIAS]);
  }
});

test("no command ws prints names any host but the configured alias", async () => {
  for (const action of ["send", "refs", "run", "test", "pull"]) {
    const result = await ws([action]);
    expect(result.code, result.stderr).toBe(0);
    for (const line of result.stdout.trim().split("\n")) {
      if (line.startsWith("ssh ")) expect(line.split(" ")[3], line).toBe(ALIAS);
      // An rsync source or destination on another machine is written host:path.
      if (line.startsWith("rsync ")) {
        for (const word of line.split(" ").filter((w) => w.includes(":"))) {
          expect(word.startsWith(`${ALIAS}:`), line).toBe(true);
        }
      }
      expect(line).not.toMatch(/@/);
    }
  }
});

test("in --print mode ws runs no git: it prints the ls-files command", async () => {
  const result = await ws(["send"]);
  const lines = result.stdout.trim().split("\n");
  expect(lines.some((l) => /^git -C \S+ ls-files -z > <list>$/.test(l))).toBe(true);
  expect(lines.find((l) => l.startsWith("rsync "))).toContain("--files-from=<list>");
});

test("refs, run, test and pull first require the marker there, and refs copies nothing back without it", async () => {
  for (const action of ["refs", "run", "test", "pull"]) {
    const result = await ws([action]);
    expect(result.code, result.stderr).toBe(0);
    const [first = ""] = result.stdout.trim().split("\n");
    expect(first, action).toMatch(/^ssh -o BatchMode=yes lab-box-example /);
    expect(first, action).toContain(`[ -e '${DIR}/.frontend-lab-ws' ] ||`);
    expect(first, action).toContain("exit 3");
  }
  // The refs command is one line on the remote; the copy back comes after it, so with
  // set -e a missing marker (exit 3) stops ws before anything is copied.
  const refs = (await ws(["refs"])).stdout.trim().split("\n");
  expect(refs[0]).toContain("test:visual --update-snapshots");
  expect(refs.findIndex((l) => l.startsWith("rsync "))).toBeGreaterThan(0);
});

test("test runs typecheck, the script tests without the guard's, then accessibility", async () => {
  const result = await ws(["test"]);
  const [line = ""] = result.stdout.trim().split("\n");
  expect(line).toContain(
    "pnpm typecheck && pnpm exec playwright test --project=scripts --grep-invert guard\\.spec\\.ts && pnpm test:a11y",
  );
});

test("ws works from a copy of the tree that is not a git repository", async () => {
  const copy = await tempDir("ws-copy");
  await mkdir(join(copy, "scripts"), { recursive: true });
  await cp(join(repoRoot, "scripts/ws"), join(copy, "scripts/ws"));
  const result = await new Promise<{ code: number; stdout: string }>((done) => {
    execFile(
      join(copy, "scripts/ws"),
      ["--print", "send"],
      {
        env: {
          ...process.env,
          FRONTEND_LAB_ENV: "/dev/null",
          FRONTEND_LAB_WS_HOST: ALIAS,
          FRONTEND_LAB_WS_DIR: DIR,
        },
      },
      (error, stdout) => done({ code: error ? Number(error.code) : 0, stdout }),
    );
  });
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("ls-files -z > <list>");
});
