import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { installHelpers, recordSteadyFocus } from "../lib/in-page.ts";
import type { Described, Manifest, Measurements } from "../lib/types.ts";
import { removeTempDirs, runScript, tempDir } from "./helpers.ts";

test.afterAll(removeTempDirs);

// `focusAfter` and `interactive` are one description: for each kind of element below, a state
// puts focus on it and the two rows must be equal. `role` and `name` are what axe gives; an
// element with no role has its tag name there.
const KINDS = [
  {
    id: "field",
    what: "a labelled text field",
    html: `<label>Name <input id="field"></label>`,
    role: "textbox",
    name: "Name",
  },
  {
    id: "close",
    what: "a button named by aria-label",
    html: `<button id="close" aria-label="Close panel">&times;</button>`,
    role: "button",
    name: "Close panel",
  },
  {
    id: "link",
    what: "a link",
    html: `<a id="link" href="#more">Read more</a>`,
    role: "link",
    name: "Read more",
  },
  {
    id: "bare",
    what: "a field with no name",
    html: `<input id="bare">`,
    role: "textbox",
    name: "",
  },
  {
    id: "tab",
    what: "an explicit role=tab",
    html: `<span role="tablist" aria-label="Views"><span id="tab" role="tab" tabindex="0" aria-selected="true">Day</span></span>`,
    role: "tab",
    name: "Day",
  },
  {
    id: "sort",
    what: 'a name with ": " in it',
    html: `<button id="sort">Sort by: name</button>`,
    role: "button",
    name: "Sort by: name",
  },
  {
    id: "summary",
    what: "a summary",
    html: `<details><summary id="summary">More</summary>Shown when open</details>`,
    role: "button",
    name: "More",
  },
  {
    id: "block",
    what: "a focusable div",
    html: `<div id="block" tabindex="0">Plain block</div>`,
    role: "div",
    name: "Plain block",
  },
  {
    id: "notes",
    what: "a contenteditable with aria-label",
    html: `<div id="notes" contenteditable="true" aria-label="Notes">x</div>`,
    role: "div",
    name: "Notes",
  },
  {
    id: "anchor",
    what: "an a without href",
    html: `<a id="anchor" tabindex="0">No href</a>`,
    role: "a",
    name: "No href",
  },
  {
    id: "in-dialog",
    what: "a control inside a modal dialog",
    click: "#open-dialog",
    html: `<button id="open-dialog">Open dialog</button>`,
    role: "textbox",
    name: "Note",
  },
];

const FOCUS = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Focus</title>
<style>
  body { font: 16px/1.5 Arial, sans-serif; margin: 16px; }
  .row { margin: 8px 0; }
  #pulse { display: inline-block; width: 8px; height: 8px; background: #333; animation: pulse 2s linear infinite; }
  @keyframes pulse { to { opacity: 0.5; } }
</style></head>
<body><main><h1>Focus</h1>
${KINDS.map((kind) => `<div class="row">${kind.html}</div>`).join("\n")}
<div class="row"><x-closed id="closed-host"></x-closed></div>
<div class="row"><button id="enter-frame">Into the frame</button>
  <iframe id="frame" title="Embedded" width="200" height="40" srcdoc="<input aria-label='Inner'>"></iframe></div>
<div class="row"><a id="to-elsewhere" href="elsewhere.html">Elsewhere</a></div>
<div class="row"><button id="drop-early">Remove early</button> <button id="drop-late">Remove late</button>
  <span id="pulse" aria-hidden="true"></span></div>
<div class="row" id="early-box"><label>Early <input id="early-field"></label></div>
<div class="row" id="late-box"><label>Late <input id="late-field"></label></div>
</main>
<dialog id="dialog" aria-label="Note"><label>Note <input id="in-dialog"></label> <button id="done">Done</button></dialog>
<script>
  const byId = (id) => document.getElementById(id);
  customElements.define("x-closed", class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "closed", delegatesFocus: true }).innerHTML = '<input aria-label="Inside">';
    }
  });
  byId("open-dialog").onclick = () => byId("dialog").showModal();
  byId("enter-frame").onclick = () => byId("frame").contentDocument.querySelector("input").focus();
  // Gone 150 ms after it took focus: before focus has been the same for 400 ms.
  byId("drop-early").onclick = () => {
    byId("early-field").focus();
    setTimeout(() => byId("early-box").remove(), 150);
  };
  // Gone when the capture takes its screenshot, which cancels a looping animation: after
  // focus was read, before the page is scanned and its interactive elements are listed.
  byId("drop-late").onclick = () => {
    byId("late-field").focus();
    byId("pulse").addEventListener("animationcancel", () => byId("late-box").remove(), { once: true });
  };
</script>
</body></html>
`;

// Focus keeps moving until the page leaves, one second after the press: the reading is still
// waiting for it to rest when the document goes away.
const LEAVES = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Leaves</title></head>
<body><main><h1>Leaves</h1>
<button id="leave">Leave</button>
<label>One <input id="one"></label> <label>Two <input id="two"></label>
</main>
<script>
  document.getElementById("leave").onclick = () => {
    let turn = 0;
    setInterval(() => document.getElementById(turn++ % 2 ? "one" : "two").focus(), 100);
    setTimeout(() => { location.href = "elsewhere.html"; }, 1000);
  };
</script>
</body></html>
`;

// Another page, where a field takes focus by itself.
const ELSEWHERE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Elsewhere</title></head>
<body><main><h1>Elsewhere</h1><label>Other <input id="other" autofocus></label></main></body></html>
`;

let target = "";
let units: Record<string, Measurements> = {};
const unit = (state: string): Measurements => {
  const found = units[`focus-800-default-${state}`];
  if (!found) throw new Error(`no unit for the state ${state}`);
  return found;
};
const selectors = (rows: { selector: string }[]) => rows.map((row) => row.selector);
// `focusAfter` is what is expected, and the element's entry in `interactive` says the same.
const expectSameInBoth = (state: string, expected: Described) => {
  const { interactive, focusAfter } = unit(state);
  expect(focusAfter).toEqual(expected);
  const listed = interactive.find((item) => item.selector === expected.selector);
  expect(listed, `${expected.selector} in interactive`).toMatchObject({ ...focusAfter });
};

test.beforeAll(async () => {
  test.setTimeout(5 * 60_000);
  const site = await tempDir("focus-site");
  await mkdir(join(site, "pages"));
  await writeFile(join(site, "pages/focus.html"), FOCUS);
  await writeFile(join(site, "pages/leaves.html"), LEAVES);
  await writeFile(join(site, "pages/elsewhere.html"), ELSEWHERE);
  const on = (state: string, click: string) => ({
    id: state,
    routes: ["focus"],
    steps: [{ click }],
  });
  target = join(site, "focus.target.json");
  await writeFile(
    target,
    JSON.stringify({
      name: "focus",
      serve: { dir: "pages" },
      widths: [800],
      routes: [
        { id: "focus", path: "/focus.html", waitFor: "h1" },
        { id: "leaves", path: "/leaves.html", waitFor: "h1" },
      ],
      states: [
        ...KINDS.map((kind) => on(kind.id, kind.click ?? `#${kind.id}`)),
        on("closed-host", "#closed-host"),
        on("frame", "#enter-frame"),
        on("early", "#drop-early"),
        on("late", "#drop-late"),
        {
          id: "elsewhere",
          routes: ["focus"],
          steps: [{ click: "#to-elsewhere" }, { waitFor: "#other" }],
        },
        { id: "leave", routes: ["leaves"], steps: [{ click: "#leave" }] },
      ],
    }),
  );
  const out = await tempDir("focus-out");
  const capture = await runScript("capture", [
    "--target",
    target,
    "--out",
    out,
    "--only",
    "focus",
  ]);
  expect(capture.code, capture.stderr).toBe(0);
  units = JSON.parse(await readFile(join(out, "measure.json"), "utf8")) as typeof units;
});

for (const kind of KINDS) {
  test(`focusAfter is the element's entry in interactive: ${kind.what}`, () => {
    const selector = `#${kind.id}`;
    expectSameInBoth(kind.id, { selector, role: kind.role, name: kind.name });
    expect(selectors(unit(kind.id).focus.stops)).toContain(selector);
  });
}

test("focus inside a closed shadow root: focusAfter is the host, described as any element is", () => {
  // Expected: the host, with its tag name for a role and no name. Why: the host is the
  // document's active element, and what a closed root holds can be read by no script in the
  // page, the capture's and axe included. So the row says what is true of the host, the way
  // `interactive` describes an element: it has no role (the tag name stands there, as for
  // the div above) and no name. The field inside is named "Inside"; that cannot be read and
  // nothing is invented for it. The host is not interactive by its markup, so `interactive`
  // has no entry to compare with; the focus walk names the same element.
  const { interactive, focusAfter, focus } = unit("closed-host");
  expect(focusAfter).toEqual({ selector: "#closed-host", role: "x-closed", name: "" });
  expect(selectors(interactive)).not.toContain("#closed-host");
  expect(selectors(focus.stops)).toContain("#closed-host");
});

test("focus inside a frame: focusAfter is the frame element", () => {
  const { focusAfter, focus } = unit("frame");
  expect(focusAfter).toEqual({ selector: "#frame", role: "iframe", name: "Embedded" });
  expect(selectors(focus.stops)).toContain("#frame");
});

test("an element removed before focus has rested gives null", () => {
  const { interactive, focusAfter } = unit("early");
  expect(focusAfter).toBeNull();
  expect(selectors(interactive)).not.toContain("#early-field");
});

test("an element removed right after focus was read is recorded as it was", () => {
  const { interactive, focusAfter } = unit("late");
  expect(focusAfter).toEqual({ selector: "#late-field", role: "textbox", name: "Late" });
  // It did leave during the capture: it was gone when the interactive elements were listed.
  expect(selectors(interactive)).not.toContain("#late-field");
});

test("a state that goes to another page and waits for it is read on that page", () => {
  expectSameInBoth("elsewhere", { selector: "#other", role: "textbox", name: "Other" });
});

// The page goes to the same place here, but while its focus is still being read: the field
// that takes focus there belongs to no unit.
test("a page that leaves while focus is being read fails its unit, and nothing is written for it", async () => {
  const out = await tempDir("leaves-out");
  const capture = await runScript("capture", [
    "--target",
    target,
    "--out",
    out,
    "--only",
    "leaves",
  ]);
  expect(capture.code).toBe(2);
  const manifest = JSON.parse(
    await readFile(join(out, "manifest.json"), "utf8"),
  ) as Manifest;
  expect(manifest.failed.map((failure) => failure.id)).toEqual([
    "leaves-800-default-leave",
  ]);
  expect(manifest.failed[0]?.error).toContain("navigation");
  expect(manifest.units.map((captured) => captured.id)).toEqual(["leaves-800-default"]);
  const written = JSON.parse(await readFile(join(out, "measure.json"), "utf8")) as Record<
    string,
    Measurements
  >;
  expect(Object.keys(written)).toEqual(["leaves-800-default"]);
});

// The reading itself, in a page of the test's own, with a stand-in for axe.
test.describe("recordSteadyFocus", () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(`<button id="go">Go</button>`);
    await page.evaluate(installHelpers);
    await page.focus("#go");
  });

  test("an element axe describes is its selector, role and name", async ({ page }) => {
    await page.evaluate(() => {
      window.axe = {
        setup: () => undefined,
        teardown: () => undefined,
        commons: {
          aria: { getRole: () => "button" },
          text: { accessibleText: () => "Go" },
        },
      };
    });
    const read = await page.evaluate(recordSteadyFocus, { steady: 50, limit: 1000 });
    expect(read).toEqual({ selector: "#go", role: "button", name: "Go" });
  });

  test("an element axe fails on is null, not a guess from its markup", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.axe = {
        setup: () => undefined,
        teardown: () => undefined,
        commons: {
          aria: {
            getRole: () => {
              throw new Error("not in the tree");
            },
          },
          text: { accessibleText: () => "Go" },
        },
      };
    });
    const read = await page.evaluate(recordSteadyFocus, { steady: 50, limit: 1000 });
    expect(read).toBeNull();
  });

  test("without axe in the page it is null", async ({ page }) => {
    const read = await page.evaluate(recordSteadyFocus, { steady: 50, limit: 1000 });
    expect(read).toBeNull();
  });
});
