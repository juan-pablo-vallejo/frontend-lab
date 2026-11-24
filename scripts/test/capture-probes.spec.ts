import { expect, test } from "@playwright/test";
import { copyFile, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { serveFolder } from "../lib/server.ts";
import { removeTempDirs, runScript, tempDir, type Finding } from "./helpers.ts";

test.afterAll(removeTempDirs);

// Pages that reproduce the review's cases for capture and measure.
const PROBE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Probe</title>
<style>
  body { font: 16px/1.5 Arial, sans-serif; margin: 16px; }
  button { min-width: 48px; min-height: 32px; margin: 4px; }
  #grow { outline: 0 solid #1a56db; transition: outline-width 300ms; }
  #grow:focus-visible { outline-width: 3px; }
  #fade { outline: 3px solid transparent; transition: outline-color 300ms; }
  #fade:focus-visible { outline-color: #1a56db; }
  #invisible:focus-visible { outline: 3px solid transparent; }
  #yellow:focus-visible { outline: 3px solid rgb(255, 221, 0); }
  #red:focus-visible { outline: 3px solid rgb(255, 0, 0); }
  #orange:focus-visible { outline: none; box-shadow: 0 0 0 3px rgb(255, 153, 0); }
  .spinner::before { content: ""; display: inline-block; width: 16px; height: 16px;
    border: 2px solid #333; animation: turn 1s linear infinite; }
  @keyframes turn { to { transform: rotate(360deg); } }
  #inline-child { width: 60px; white-space: nowrap; overflow: hidden; }
  .grad { background: linear-gradient(#ffffff, #777777); color: #555555; padding: 8px; }
</style></head>
<body>
<main>
  <h1>Probe</h1>
  <button id="grow">Grow</button>
  <button id="fade">Fade</button>
  <button id="plain">Plain</button>
  <button id="invisible">Invisible</button>
  <button id="yellow">Yellow</button>
  <button id="red">Red</button>
  <button id="orange">Orange</button>
  <span class="spinner" role="img" aria-label="Loading"></span>
  <div id="inline-child"><span>This text is far too long for its box</span></div>
  <p class="grad">Text over a gradient</p>
  <div id="host"></div>
  <img src="http://example.invalid/pixel.png" alt="" width="1" height="1">
</main>
<script>
  const root = document.getElementById("host").attachShadow({ mode: "open" });
  root.innerHTML = '<style>@keyframes pulse { 50% { opacity: .5; } } .dot { width: 8px; height: 8px; background: #333; animation: pulse 2s infinite; }</style><div class="dot"></div>';
  setTimeout(() => {
    const ready = document.createElement("button");
    ready.id = "ready";
    ready.textContent = "Ready";
    document.querySelector("main").append(ready);
  }, 3000);
</script>
</body></html>
`;

const MANY = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Many</title>
<style>
  body { font: 16px/1.5 Arial, sans-serif; margin: 16px; }
  a { display: inline-block; padding: 4px; }
  #slow { width: 20px; height: 20px; background: #333; animation: move 20s linear 1; }
  @keyframes move { to { opacity: 0.5; } }
</style></head>
<body><main><h1>Many</h1><div id="slow"></div>
${Array.from({ length: 65 }, (_, i) => `<a href="#a${i}">Link ${i}</a>`).join("\n")}
</main></body></html>
`;

let site = "";
let out = "";
let findings: Finding[] = [];
let measure = { code: -1, stdout: "", stderr: "" };

test.beforeAll(async () => {
  test.setTimeout(5 * 60_000);
  site = await tempDir("probe-site");
  await mkdir(join(site, "pages"));
  await writeFile(join(site, "pages/probe.html"), PROBE);
  await writeFile(join(site, "pages/many.html"), MANY);
  await writeFile(
    join(site, "probe.target.json"),
    JSON.stringify({
      name: "probe",
      serve: { dir: "pages" },
      widths: [800],
      routes: [
        { id: "probe", path: "/probe.html", waitFor: "#ready" },
        { id: "many", path: "/many.html" },
      ],
    }),
  );
  out = await tempDir("probe-out");
  const capture = await runScript("capture", [
    "--target",
    join(site, "probe.target.json"),
    "--out",
    out,
  ]);
  expect(capture.code, capture.stderr).toBe(0);
  measure = await runScript("measure", ["--in", out]);
  findings = JSON.parse(await readFile(join(out, "findings.json"), "utf8")) as Finding[];
});

const on = (route: string, key: string) =>
  findings.filter((f) => f.unit.route === route && f.key === key);

test("M10: a route's waitFor is awaited before the unit is measured", async () => {
  // The page adds #ready after 3000 ms, later than the fixed second.
  const m = JSON.parse(await readFile(join(out, "measure.json"), "utf8")) as Record<
    string,
    { interactive: { selector: string }[] }
  >;
  expect(m["probe-800-default"]?.interactive.map((i) => i.selector)).toContain("#ready");
});

test("I10: a focus ring that eases in, and the browser's own ring, are not findings", () => {
  const selectors = on("probe", "focus-ring").map((f) => f.selector);
  expect(selectors).not.toContain("#grow");
  expect(selectors).not.toContain("#fade");
  expect(selectors).not.toContain("#plain");
});

test("N2: an opaque colour with no blue in it is a visible change", () => {
  const selectors = on("probe", "focus-ring").map((f) => f.selector);
  expect(selectors).not.toContain("#yellow");
  expect(selectors).not.toContain("#red");
  expect(selectors).not.toContain("#orange");
});

test("I10: a transparent outline is no visible change", () => {
  expect(on("probe", "focus-ring").map((f) => f.selector)).toContain("#invisible");
});

test("M7: a looping animation on a pseudo-element or in a shadow root is found", () => {
  const selectors = on("probe", "reduced-motion").map((f) => f.selector);
  expect(selectors.some((s) => s.endsWith("::before"))).toBe(true);
  expect(selectors.some((s) => s.startsWith("#host >> "))).toBe(true);
});

test("M8: clipped text inside an inline child is truncation", () => {
  expect(on("probe", "truncation").map((f) => f.selector)).toContain("#inline-child");
});

test("I11: a request to another host is blocked, not made", () => {
  const blocked = on("probe", "request-failed");
  expect(blocked).toHaveLength(1);
  expect(String(blocked[0]?.measured)).toContain("BLOCKED_BY_CLIENT");
});

test("M13: axe's incomplete results are kept and noticed, not findings", async () => {
  const axe = JSON.parse(await readFile(join(out, "axe.json"), "utf8")) as Record<
    string,
    { incomplete: { id: string }[] }
  >;
  expect(axe["probe-800-default"]?.incomplete.map((r) => r.id)).toContain(
    "color-contrast",
  );
  expect(measure.stderr).toMatch(/probe-800-default: axe could not decide \d+ rule/);
  expect(findings.some((f) => f.key === "contrast" && f.unit.route === "probe")).toBe(
    false,
  );
});

test("I9: an unsettled unit and a focus walk cut at 60 stops are reported", () => {
  expect(measure.stderr).toContain("many-800-default: the page had not settled");
  expect(measure.stderr).toContain(
    "many-800-default: the focus walk stopped at 60 stops",
  );
});

test("M12: the manifest records the target file's base name only", async () => {
  const manifest = JSON.parse(await readFile(join(out, "manifest.json"), "utf8")) as {
    options: { target: string };
  };
  expect(manifest.options.target).toBe("probe.target.json");
});

test("I9: a missing per-unit entry makes the folder unreadable", async () => {
  const copy = await tempDir("probe-copy");
  for (const name of ["manifest.json", "axe.json", "measure.json"]) {
    await copyFile(join(out, name), join(copy, name));
  }
  await writeFile(join(copy, "console.json"), "{}\n");
  const result = await runScript("measure", ["--in", copy]);
  expect(result.code).toBe(2);
  expect(result.stderr).toContain("console.json has no entry for");
});

test("I11 and I9: a route on another host fails its unit, and measure refuses the folder", async () => {
  await writeFile(
    join(site, "away.target.json"),
    JSON.stringify({
      name: "away",
      serve: { dir: "pages" },
      widths: [800],
      routes: [
        { id: "local", path: "/many.html" },
        { id: "away", path: "http://example.invalid/" },
      ],
    }),
  );
  const awayOut = await tempDir("away-out");
  const capture = await runScript("capture", [
    "--target",
    join(site, "away.target.json"),
    "--out",
    awayOut,
    "--only",
    "away",
  ]);
  expect(capture.code).toBe(2);
  expect(capture.stderr).toContain("away-800-default");
  expect(capture.stderr).toContain("ERR_BLOCKED_BY_CLIENT");
  const result = await runScript("measure", ["--in", awayOut]);
  expect(result.code).toBe(2);
  expect(result.stderr).toContain("capture failed for away-800-default");
});

test("M9: repeated widths and colliding unit ids are refused", async () => {
  const dir = await tempDir("ids");
  const base = {
    name: "ids",
    baseUrl: "http://127.0.0.1:9",
    routes: [{ id: "r", path: "/" }],
  };
  await writeFile(join(dir, "w.json"), JSON.stringify({ ...base, widths: [390, 390] }));
  const widths = await runScript("capture", [
    "--target",
    join(dir, "w.json"),
    "--out",
    dir,
  ]);
  expect(widths.code).toBe(2);
  expect(widths.stderr).toContain("widths must not repeat");
  await writeFile(
    join(dir, "c.json"),
    JSON.stringify({
      ...base,
      widths: [390],
      languages: [{ id: "en-GB" }, { id: "en" }],
      states: [{ id: "GB", steps: [{ waitMs: 1 }] }],
    }),
  );
  const ids = await runScript("capture", ["--target", join(dir, "c.json"), "--out", dir]);
  expect(ids.code).toBe(2);
  expect(ids.stderr).toContain('unit id "r-390-en-GB" would be made twice');
});

test("M15: the static server does not follow a link out of its folder", async () => {
  const dir = await tempDir("serve");
  const outside = await tempDir("outside");
  await writeFile(join(outside, "secret.txt"), "outside\n");
  await mkdir(join(dir, "www"));
  await writeFile(join(dir, "www", "inside.txt"), "inside\n");
  await symlink(join(outside, "secret.txt"), join(dir, "www", "link.txt"));
  const server = await serveFolder(join(dir, "www"));
  try {
    expect((await fetch(`${server.url}/inside.txt`)).status).toBe(200);
    expect((await fetch(`${server.url}/link.txt`)).status).toBe(404);
  } finally {
    await server.close();
  }
});

test("I11: a redirect, a redirected sub-resource and a WebSocket to another host do not connect", async () => {
  // Without the proxy these fail with ERR_NAME_NOT_RESOLVED: the browser asked the network
  // for the other host. With it they fail at the closed loopback proxy, before any lookup.
  const away = "http://example.invalid";
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="icon" href="data:,"><title>Away</title></head><body><main><h1>Away</h1>
<img src="/img-redirect" alt="" width="1" height="1">
<script>new WebSocket("ws://example.invalid/sock");</script></main></body></html>`;
  const local = createServer((request, response) => {
    if (request.url === "/redirect") {
      response.writeHead(302, { location: `${away}/landing.html` });
      response.end();
    } else if (request.url === "/img-redirect") {
      response.writeHead(302, { location: `${away}/pixel.png` });
      response.end();
    } else {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(page);
    }
  });
  await new Promise<void>((done) => local.listen(0, "127.0.0.1", () => done()));
  try {
    const dir = await tempDir("away");
    await writeFile(
      join(dir, "t.json"),
      JSON.stringify({
        name: "away",
        baseUrl: `http://127.0.0.1:${(local.address() as AddressInfo).port}`,
        widths: [800],
        routes: [
          { id: "page", path: "/page.html" },
          { id: "redirect", path: "/redirect" },
        ],
      }),
    );
    const out = join(dir, "out");
    const capture = await runScript("capture", [
      "--target",
      join(dir, "t.json"),
      "--out",
      out,
    ]);
    expect(capture.code).toBe(2);
    expect(capture.stderr).toMatch(
      /failed redirect-800-default: .*ERR_PROXY_CONNECTION_FAILED/,
    );
    expect(capture.stderr).not.toContain("failed page-800-default");
    const records = JSON.parse(
      await readFile(join(out, "console.json"), "utf8"),
    ) as Record<
      string,
      { messages: { text: string }[]; failedRequests: { url: string; failure: string }[] }
    >;
    const unit = records["page-800-default"];
    const pixel = unit?.failedRequests.find((r) => r.url.includes("pixel.png"));
    expect(pixel?.failure).toBe("net::ERR_PROXY_CONNECTION_FAILED");
    const socket = unit?.messages.find((m) => m.text.includes("WebSocket"));
    expect(socket?.text).toContain("ERR_PROXY_CONNECTION_FAILED");
    expect(JSON.stringify(unit)).not.toContain("ERR_NAME_NOT_RESOLVED");
  } finally {
    local.closeAllConnections();
    await new Promise((done) => local.close(done));
  }
});
