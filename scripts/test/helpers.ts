import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const fixtureTarget = join(repoRoot, "qa/fixtures/seeded-defects.target.json");

export type RunResult = { code: number; stdout: string; stderr: string };

// Environment overrides: a value of undefined removes that variable for the child.
export function runScript(
  name: "capture" | "measure" | "validate" | "guard" | "ws",
  args: string[],
  options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    input?: string;
    timeout?: number;
  } = {},
): Promise<RunResult> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return new Promise((resolvePromise) => {
    const child = execFile(
      join(repoRoot, "scripts", name),
      args,
      {
        cwd: options.cwd ?? tmpdir(),
        env,
        timeout: options.timeout ?? 0,
        maxBuffer: 64 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const code =
          error && typeof error.code === "number" ? error.code : error ? -1 : 0;
        resolvePromise({ code, stdout, stderr });
      },
    );
    if (options.input !== undefined) child.stdin?.end(options.input);
    else child.stdin?.end();
  });
}

const created: string[] = [];

// A new folder in the system temp folder; removeTempDirs deletes every one made so far.
export async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `frontend-lab-${prefix}-`));
  created.push(dir);
  return dir;
}

export async function removeTempDirs(): Promise<void> {
  const dirs = created.splice(0);
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
}

export type Finding = {
  key: string;
  unit: { route: string; width: number; lang: string; state: string | null };
  selector: string;
  measured: unknown;
  threshold: unknown;
  evidence: { shot: string; rule?: string };
};
