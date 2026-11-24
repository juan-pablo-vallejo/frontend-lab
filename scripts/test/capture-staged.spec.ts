import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import type { ConsoleRecord, Manifest, Measurements } from "../lib/types.ts";
import { removeTempDirs, runScript, tempDir } from "./helpers.ts";

test.afterAll(removeTempDirs);

// A form whose send is a real request to the test's own server, with no guard against a
// second press: each press sends again, so the count of held requests shows every press.
// Like the fixture, it reads only the answer's status, never its body.
const STAGED = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Staged</title>
<style>body { font: 16px/1.5 Arial, sans-serif; margin: 16px; } button { min-height: 32px; }</style>
</head><body><main><h1>Staged</h1>
<form id="form" novalidate>
  <label>Name <input id="name"></label>
  <p id="error" role="alert"></p>
  <button id="send">Send</button>
</form>
<p id="status" role="status"></p>
</main>
<script>
  const byId = (id) => document.getElementById(id);
  byId("form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!byId("name").value) {
      byId("error").textContent = "Enter a name.";
      byId("name").setAttribute("aria-invalid", "true");
      return;
    }
    byId("status").textContent = "Sending";
    byId("send").setAttribute("aria-busy", "true");
    fetch("reply.json", { method: "POST", body: byId("name").value }).then((response) => {
      if (!response.ok) return;
      byId("status").textContent = "Sent";
      byId("send").removeAttribute("aria-busy");
    });
  });
</script>
</body></html>
`;

// A page that brings its own axe: the capture must leave it alone.
const OWN_AXE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Own axe</title>
<script>window.axe = { own: true };</script>
</head><body><main><h1>Own axe</h1>
<button id="check">Check</button>
<p id="seen" role="status"></p>
</main>
<script>
  document.getElementById("check").addEventListener("click", () => {
    document.getElementById("seen").textContent =
      window.axe && window.axe.own ? "own" : "replaced";
  });
</script>
</body></html>
`;

// A window named "axe" is reachable as window.axe too; that is not a library.
const FRAME_AXE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Frame axe</title>
</head><body><main><h1>Frame axe</h1>
<iframe name="axe" title="Named axe" srcdoc="<p>Inner</p>"></iframe>
<button id="go">Go</button>
</main></body></html>
`;

const PAGES: Record<string, string> = {
  "/staged.html": STAGED,
  "/own-axe.html": OWN_AXE,
  "/frame-axe.html": FRAME_AXE,
};

// Every send that reaches the server, by the name it carried. "Stuck" is never answered.
const arrived: string[] = [];
let server: Server;

let out = "";
let captureCode = -1;
let captureStderr = "";
let units: Record<string, Measurements> = {};
let consoles: Record<string, ConsoleRecord> = {};
let manifest: Manifest & { notes?: { id: string; note: string }[] };
const unit = (id: string): Measurements => {
  const found = units[id];
  if (!found) throw new Error(`no unit ${id}`);
  return found;
};
const region = (id: string, selector: string) =>
  unit(id).liveRegions.find((r) => r.selector === selector)?.text;
const statesOf = (id: string, selector: string) =>
  unit(id).interactive.find((i) => i.selector === selector)?.states;

test.beforeAll(async () => {
  test.setTimeout(5 * 60_000);
  server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://x").pathname;
    if (path === "/reply.json" && request.method === "POST") {
      let body = "";
      request.on("data", (chunk: Buffer) => (body += chunk.toString()));
      request.on("end", () => {
        arrived.push(body);
        if (body === "Stuck") return;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(`{ "ok": true }`);
      });
      return;
    }
    const page = PAGES[path];
    response.writeHead(page ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
    response.end(page ?? "not found");
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as AddressInfo;
  const site = await tempDir("staged-site");
  const target = join(site, "staged.target.json");
  const send = (name: string) => [{ fill: ["#name", name] }];
  await writeFile(
    target,
    JSON.stringify({
      name: "staged",
      baseUrl: `http://127.0.0.1:${port}`,
      widths: [800],
      routes: [
        { id: "staged", path: "/staged.html", waitFor: "h1" },
        { id: "ownaxe", path: "/own-axe.html", waitFor: "h1" },
        { id: "frameaxe", path: "/frame-axe.html", waitFor: "h1" },
      ],
      states: [
        {
          id: "inflight",
          routes: ["staged"],
          steps: [
            ...send("Held"),
            { hold: "**/reply.json" },
            { click: "#send" },
            { waitFor: "#send[aria-busy='true']" },
            { click: "#send" },
          ],
        },
        {
          id: "stuck",
          routes: ["staged"],
          steps: [...send("Stuck"), { hold: "**/reply.json" }, { click: "#send" }],
        },
        {
          id: "answered",
          routes: ["staged"],
          steps: [
            ...send("Free"),
            { click: "#send" },
            { waitFor: "#send:not([aria-busy])" },
          ],
        },
        {
          id: "enter",
          routes: ["staged"],
          steps: [{ press: ["#name", "Enter"] }],
        },
        { id: "checked", routes: ["ownaxe"], steps: [{ click: "#check" }] },
        { id: "went", routes: ["frameaxe"], steps: [{ click: "#go" }] },
      ],
    }),
  );
  out = await tempDir("staged-out");
  const capture = await runScript("capture", ["--target", target, "--out", out], {
    timeout: 4 * 60_000,
  });
  captureCode = capture.code;
  captureStderr = capture.stderr;
  units = JSON.parse(await readFile(join(out, "measure.json"), "utf8")) as typeof units;
  consoles = JSON.parse(
    await readFile(join(out, "console.json"), "utf8"),
  ) as typeof consoles;
  manifest = JSON.parse(
    await readFile(join(out, "manifest.json"), "utf8"),
  ) as typeof manifest;
});

test.afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((done) => server.close(() => done()));
});

test("every unit is captured", () => {
  expect(captureCode, captureStderr).toBe(0);
  expect(manifest.failed).toEqual([]);
  expect(consoles["staged-800-default-inflight"]?.failedRequests).toEqual([]);
});

test("release: each held request reaches the server once the unit is measured", () => {
  expect(arrived.filter((name) => name === "Held")).toEqual(["Held", "Held"]);
  expect(arrived.filter((name) => name === "Stuck")).toEqual(["Stuck"]);
});

test("release: the evidence says each held request was in flight at capture, then answered", () => {
  const requests = unit("staged-800-default-inflight").held[0]?.requests ?? [];
  expect(requests).toHaveLength(2);
  for (const request of requests) {
    expect(request).toMatchObject({
      method: "POST",
      inFlightAtCapture: true,
      outcome: "answered",
      status: 200,
    });
  }
});

test("release: a request the server never answers is told apart as open", () => {
  const requests = unit("staged-800-default-stuck").held[0]?.requests ?? [];
  expect(requests).toEqual([
    expect.objectContaining({ inFlightAtCapture: true, outcome: "open", status: null }),
  ]);
});

test("hold: the state is measured while its request is in flight", () => {
  const id = "staged-800-default-inflight";
  expect(region(id, "#status")).toBe("Sending");
  expect(statesOf(id, "#send")).toEqual({ "aria-busy": "true" });
});

test("hold: the evidence counts the requests made, one per press here", () => {
  const held = unit("staged-800-default-inflight").held;
  expect(held).toHaveLength(1);
  expect(held[0]?.pattern).toBe("**/reply.json");
  expect(held[0]?.requests.map((r) => r.method)).toEqual(["POST", "POST"]);
  expect(held[0]?.requests.every((r) => r.url.endsWith("/reply.json"))).toBe(true);
});

test("without hold the same send is answered, and nothing is listed as held", () => {
  const id = "staged-800-default-answered";
  expect(region(id, "#status")).toBe("Sent");
  expect(statesOf(id, "#send")).toEqual({});
  expect(unit(id).held).toEqual([]);
  expect(unit("staged-800-default").held).toEqual([]);
});

test("press on a selector: Enter in the field, focus stays there", () => {
  const id = "staged-800-default-enter";
  expect(region(id, "#error")).toBe("Enter a name.");
  expect(statesOf(id, "#name")).toEqual({ "aria-invalid": "true" });
  expect(unit(id).focusAfter).toEqual({
    selector: "#name",
    role: "textbox",
    name: "Name",
  });
});

test("a page with its own window.axe keeps it: focusAfter is null and the manifest says why", () => {
  const id = "ownaxe-800-default-checked";
  expect(region(id, "#seen")).toBe("own");
  expect(unit(id).focusAfter).toBeNull();
  const notes = manifest.notes ?? [];
  expect(notes).toHaveLength(1);
  expect(notes[0]?.id).toBe(id);
  expect(notes[0]?.note).toContain("window.axe");
  expect(notes[0]?.note).toContain("focusAfter");
});

test("a frame named axe is not the page's own axe: focusAfter is read, no note", () => {
  const id = "frameaxe-800-default-went";
  expect(unit(id).focusAfter).toEqual({ selector: "#go", role: "button", name: "Go" });
  expect((manifest.notes ?? []).map((n) => n.id)).not.toContain(id);
});

test("measure prints the manifest's note as a notice", async () => {
  const measured = await runScript("measure", ["--in", out]);
  expect(measured.stderr).toContain("notice: ownaxe-800-default-checked: ");
});
