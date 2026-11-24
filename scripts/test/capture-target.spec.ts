import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { removeTempDirs, runScript, tempDir } from "./helpers.ts";

test.afterAll(removeTempDirs);

test("a target whose baseUrl is not loopback is refused without --allow-remote", async () => {
  const dir = await tempDir("remote");
  const target = join(dir, "remote.target.json");
  await writeFile(
    target,
    JSON.stringify({
      name: "remote",
      baseUrl: "https://example.com",
      routes: [{ id: "home", path: "/" }],
    }),
  );
  const result = await runScript("capture", [
    "--target",
    target,
    "--out",
    join(dir, "out"),
  ]);
  expect(result.code).toBe(2);
  expect(result.stderr).toContain("loopback");
  expect(existsSync(join(dir, "out", "manifest.json"))).toBe(false);
});

test("a target with both baseUrl and serve is refused", async () => {
  const dir = await tempDir("both");
  const target = join(dir, "both.target.json");
  await writeFile(
    target,
    JSON.stringify({
      name: "both",
      baseUrl: "http://127.0.0.1:9",
      serve: { dir: "." },
      routes: [{ id: "home", path: "/" }],
    }),
  );
  const result = await runScript("capture", [
    "--target",
    target,
    "--out",
    join(dir, "out"),
  ]);
  expect(result.code).toBe(2);
  expect(result.stderr).toContain("exactly one of baseUrl and serve");
});

test("measure exits 2 on an unreadable folder", async () => {
  const dir = await tempDir("unreadable");
  const result = await runScript("measure", ["--in", join(dir, "missing")]);
  expect(result.code).toBe(2);
});

test("loopback means localhost, 127.0.0.1 and [::1] only, as the proxy bypass does", async () => {
  const dir = await tempDir("loopback");
  for (const [host, refused] of [
    ["127.0.0.2", true],
    ["localhost.", true],
    ["0.0.0.0", true],
  ] as const) {
    const target = join(dir, "t.json");
    await writeFile(
      target,
      JSON.stringify({
        name: "t",
        baseUrl: `http://${host}:9`,
        routes: [{ id: "r", path: "/" }],
      }),
    );
    const result = await runScript("capture", [
      "--target",
      target,
      "--out",
      join(dir, "out"),
    ]);
    expect(result.code, host).toBe(refused ? 2 : 0);
    expect(result.stderr, host).toContain("not a loopback address");
  }
});

test.describe("staging steps in the target file", () => {
  const base = {
    name: "t",
    baseUrl: "http://127.0.0.1:9",
    routes: [{ id: "r", path: "/" }],
  };
  const withState = (steps: unknown[]) => ({ ...base, states: [{ id: "s", steps }] });

  test("press takes a key for the focused element, or [selector, key]", async () => {
    const { validateTarget } = await import("../lib/target.ts");
    expect(validateTarget(withState([{ press: "Enter" }]))).toEqual([]);
    expect(validateTarget(withState([{ press: ["#field", "Enter"] }]))).toEqual([]);
    for (const bad of [
      [],
      ["#field"],
      ["#field", ""],
      ["", "Enter"],
      ["#a", "Enter", 1],
      3,
    ]) {
      expect(validateTarget(withState([{ press: bad }])), JSON.stringify(bad)).toEqual([
        "states[0].steps[0].press must be a key or [selector, key]",
      ]);
    }
  });

  test("hold takes a URL glob, in a state's steps only", async () => {
    const { validateTarget } = await import("../lib/target.ts");
    expect(validateTarget(withState([{ hold: "**/save.json" }]))).toEqual([]);
    for (const bad of ["", "  ", 3, ["**/x"]]) {
      expect(validateTarget(withState([{ hold: bad }])), JSON.stringify(bad)).toEqual([
        "states[0].steps[0].hold must be a non-empty URL glob",
      ]);
    }
    expect(validateTarget({ ...base, signIn: [{ hold: "**/x" }] })).toEqual([
      "signIn[0].hold is allowed only in a state's steps",
    ]);
    expect(
      validateTarget({ ...base, languages: [{ id: "en", steps: [{ hold: "**/x" }] }] }),
    ).toEqual(["languages[0].steps[0].hold is allowed only in a state's steps"]);
  });
});
