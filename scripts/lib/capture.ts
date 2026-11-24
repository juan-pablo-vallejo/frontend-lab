import AxeBuilder from "@axe-core/playwright";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  animationsDone,
  boxesOf,
  collectMotion,
  collectStatic,
  focusedSettled,
  recordSteadyFocus,
  focusStop,
  installHelpers,
  prepareFocusWalk,
} from "./in-page.ts";
import { serveFolder, type StaticServer } from "./server.ts";
import {
  isLoopbackUrl,
  LOOPBACK_HOSTS,
  unitId,
  validateTarget,
  withDefaults,
  type ResolvedTarget,
} from "./target.ts";
import type {
  AxeUnit,
  AxeViolation,
  ConsoleRecord,
  FocusStop,
  Manifest,
  Measurements,
  Step,
  Target,
  Unit,
} from "./types.ts";

const VIEWPORT_HEIGHT = 800;
// Port 9 (discard) on loopback: nothing listens there, so a proxied connection fails at once.
const CLOSED_PROXY = "http://127.0.0.1:9";
const MAX_TAB_STOPS = 60;
const SETTLE_AFTER_LOAD_MS = 1000;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const USAGE =
  "usage: scripts/capture --target <file> --out <dir> [--only <route>] [--reduced-motion] [--repo <dir>] [--allow-remote]";

class BadInput extends Error {}

function fail(message: string): never {
  throw new BadInput(message);
}

function options() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        target: { type: "string" },
        out: { type: "string" },
        only: { type: "string" },
        "reduced-motion": { type: "boolean", default: false },
        repo: { type: "string" },
        "allow-remote": { type: "boolean", default: false },
      },
      strict: true,
      allowPositionals: false,
    }).values;
  } catch (error) {
    fail(`${(error as Error).message}\n${USAGE}`);
  }
  if (!parsed.target || !parsed.out) fail(USAGE);
  return {
    target: resolve(parsed.target),
    out: resolve(parsed.out),
    only: parsed.only ?? null,
    reducedMotion: parsed["reduced-motion"] ?? false,
    repo: parsed.repo ? resolve(parsed.repo) : null,
    allowRemote: parsed["allow-remote"] ?? false,
  };
}

async function loadTarget(file: string): Promise<ResolvedTarget> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    fail(`cannot read the target ${file}: ${(error as Error).message}`);
  }
  const errors = validateTarget(raw);
  if (errors.length > 0) fail(`bad target ${file}:\n  ${errors.join("\n  ")}`);
  return withDefaults(raw as Target);
}

function repoState(dir: string): Manifest["repo"] {
  try {
    const commit = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const status = execFileSync("git", ["-C", dir, "status", "--porcelain"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { commit, dirty: status.trim().length > 0 };
  } catch {
    fail(`--repo ${dir} is not a git repository with a commit`);
  }
}

function playwrightVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require("@playwright/test/package.json") as { version: string };
  return pkg.version;
}

// The text of axe-core, which @axe-core/playwright puts into a page before a scan. It is
// that package's dependency, not this repository's, so it is looked up from there.
function axeSource(): string {
  const require = createRequire(import.meta.url);
  const fromBuilder = createRequire(require.resolve("@axe-core/playwright"));
  return (fromBuilder("axe-core") as { source: string }).source;
}

function withQuery(url: string, query: string | undefined): string {
  if (!query) return url;
  const parsed = new URL(url);
  for (const [name, value] of new URLSearchParams(query))
    parsed.searchParams.set(name, value);
  return parsed.toString();
}

async function runSteps(page: Page, base: string, steps: Step[]): Promise<void> {
  for (const step of steps) {
    if ("goto" in step) await page.goto(new URL(step.goto, base).toString());
    else if ("click" in step) await page.click(step.click);
    else if ("fill" in step) await page.fill(step.fill[0], step.fill[1]);
    else if ("press" in step) await page.keyboard.press(step.press);
    else if ("waitFor" in step)
      await page.waitForSelector(step.waitFor, { state: "visible" });
    else await page.waitForTimeout(step.waitMs);
  }
}

async function settle(page: Page): Promise<boolean> {
  try {
    await page.waitForFunction(animationsDone, null, { timeout: 5000, polling: 100 });
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => done())),
        ),
    );
    return true;
  } catch {
    return false;
  }
}

type AxeRule = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

function toRecord(violation: AxeRule): AxeViolation {
  return {
    id: violation.id,
    impact: violation.impact ?? null,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => {
      const checks = [...node.any, ...node.all, ...node.none];
      const data = checks.find(
        (check) => check.data && typeof check.data === "object",
      )?.data;
      return {
        selector: node.target
          .map((part) => (Array.isArray(part) ? part.join(" ") : part))
          .join(" "),
        summary: node.failureSummary ?? "",
        box: null,
        data: (data as Record<string, unknown> | undefined) ?? null,
      };
    }),
  };
}

// Violations and the results axe could not decide ("incomplete"), each node with its box.
async function runAxe(page: Page): Promise<AxeUnit> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations = results.violations.map(toRecord);
  const incomplete = results.incomplete.map(toRecord);
  const all = [...violations, ...incomplete];
  const selectors = all.flatMap((rule) => rule.nodes.map((n) => n.selector));
  const boxes = await page.evaluate(boxesOf, selectors);
  let index = 0;
  for (const rule of all) {
    for (const node of rule.nodes) node.box = boxes[index++] ?? null;
  }
  return { violations, incomplete };
}

async function walkFocus(page: Page): Promise<Measurements["focus"]> {
  await page.evaluate(prepareFocusWalk);
  const stops: FocusStop[] = [];
  let first = "";
  let previous = "";
  let bodyStops = 0;
  for (let i = 0; i < MAX_TAB_STOPS; i += 1) {
    await page.keyboard.press("Tab");
    // Let a focus transition reach its end before the element is read (at most 1 s).
    await page
      .waitForFunction(focusedSettled, null, { timeout: 1000, polling: 50 })
      .catch(() => undefined);
    const stop = await page.evaluate(focusStop);
    // One stop on the body is passed over: under a modal dialog, Tab goes through the
    // browser's own controls and comes back into the dialog.
    if (!stop || stop.atBody) {
      if (bodyStops === 0) {
        bodyStops += 1;
        continue;
      }
      return { stops, limitReached: false };
    }
    if (stop.key === first) return { stops, limitReached: false };
    if (stop.key === previous) continue;
    if (!first) first = stop.key;
    previous = stop.key;
    const { atBody: _atBody, key: _key, ...record } = stop;
    stops.push(record);
  }
  return { stops, limitReached: true };
}

async function measureMotion(
  page: Page,
  reducedMotion: boolean,
): Promise<Measurements["motion"]> {
  let noPreference: Measurements["motion"]["noPreference"] = null;
  if (!reducedMotion) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    noPreference = await page.evaluate(collectMotion);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduce = await page.evaluate(collectMotion);
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  return { noPreference, reduce };
}

type UnitResult = { axe: AxeUnit; measure: Measurements; console: ConsoleRecord };

async function captureUnit(
  context: BrowserContext,
  unit: Unit,
  steps: { lang: Step[]; state: Step[] },
  waitFor: string | undefined,
  base: string,
  out: string,
  reducedMotion: boolean,
): Promise<UnitResult> {
  const page = await context.newPage();
  const record: ConsoleRecord = { messages: [], pageErrors: [], failedRequests: [] };
  page.on("console", (message) => {
    const type = message.type();
    if (type === "error" || type === "warning")
      record.messages.push({ type, text: message.text() });
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message));
  page.on("requestfailed", (request) =>
    record.failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? "failed",
    }),
  );
  page.on("response", (response) => {
    if (response.status() >= 400) {
      record.failedRequests.push({
        url: response.url(),
        failure: `HTTP ${response.status()}`,
      });
    }
  });
  try {
    await page.goto(unit.url, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    // The route's own sign that the page is ready, or else a fixed second.
    if (waitFor)
      await page.waitForSelector(waitFor, { state: "visible", timeout: 15_000 });
    else await page.waitForTimeout(SETTLE_AFTER_LOAD_MS);
    await runSteps(page, base, steps.lang);
    // What has focus after a named state's steps is described by the page itself, the moment
    // it is read, as `interactive` is described: with axe. So axe goes into the page here,
    // before those steps rather than after them, where it would hold up the reading, and
    // into any document they load.
    if (unit.state) {
      const source = axeSource();
      await page.addInitScript({ content: source });
      await page.evaluate(source);
    }
    await runSteps(page, base, steps.state);

    const settled = await settle(page);
    // Evidence: what has focus once a named state's steps are done. Read until it has not
    // changed for 400 ms (at most 2 s), so a dialog that moves focus on the next frame, after
    // a timer or at the end of its transition is seen with focus inside it.
    const focusAfter = unit.state
      ? await page.evaluate(recordSteadyFocus, { steady: 400, limit: 2000 })
      : null;

    await page.screenshot({
      path: join(out, unit.shot),
      fullPage: true,
      animations: "disabled",
    });
    const axe = await runAxe(page);
    const statics = await page.evaluate(collectStatic);
    const layoutShift = await page.evaluate(() => {
      const shifts = window.__lab.shifts;
      const score = shifts
        .filter((s) => !s.hadRecentInput)
        .reduce((sum, s) => sum + s.value, 0);
      return { score: Math.round(score * 10000) / 10000, shifts };
    });
    const focus = await walkFocus(page);
    const motion = await measureMotion(page, reducedMotion);
    return {
      axe,
      measure: { settled, ...statics, focusAfter, focus, motion, layoutShift },
      console: record,
    };
  } finally {
    await page.close();
  }
}

async function main(): Promise<number> {
  const opts = options();
  const target = await loadTarget(opts.target);

  if (target.baseUrl && !isLoopbackUrl(target.baseUrl) && !opts.allowRemote) {
    fail(
      `baseUrl ${target.baseUrl} is not a loopback address; pass --allow-remote to capture it`,
    );
  }
  const routes = opts.only
    ? target.routes.filter((r) => r.id === opts.only)
    : target.routes;
  if (routes.length === 0) fail(`--only ${opts.only}: the target has no such route`);
  let serveDir: string | null = null;
  if (target.serve) {
    serveDir = resolve(dirname(opts.target), target.serve.dir);
    if (!existsSync(serveDir) || !statSync(serveDir).isDirectory()) {
      fail(`serve.dir ${target.serve.dir} is not a folder next to the target file`);
    }
  }
  const repo = opts.repo ? repoState(opts.repo) : null;

  await mkdir(join(opts.out, "shots"), { recursive: true });
  const startedAt = new Date().toISOString();
  let server: StaticServer | null = null;
  let browser: Browser | null = null;
  const units: Unit[] = [];
  const failed: Manifest["failed"] = [];
  const axeOut: Record<string, AxeUnit> = {};
  const measureOut: Record<string, Measurements> = {};
  const consoleOut: Record<string, ConsoleRecord> = {};
  let browserVersion: string;

  const cleanup = async () => {
    await browser?.close().catch(() => undefined);
    await server?.close().catch(() => undefined);
  };
  const onSignal = () => {
    void cleanup().then(() => process.exit(130));
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    if (serveDir) server = await serveFolder(serveDir);
    const base = target.baseUrl ?? server!.url;
    // Without --allow-remote nothing but loopback can be reached at all: every connection
    // goes to a proxy on a closed loopback port, except loopback itself. This also stops what
    // the route handler below never sees: a redirect's target and a WebSocket.
    browser = await chromium.launch({
      headless: true,
      ...(opts.allowRemote
        ? {}
        : { proxy: { server: CLOSED_PROXY, bypass: LOOPBACK_HOSTS.join(",") } }),
    });
    browserVersion = browser.version();

    for (const width of target.widths) {
      const context = await browser.newContext({
        viewport: { width, height: VIEWPORT_HEIGHT },
        deviceScaleFactor: 1,
        reducedMotion: opts.reducedMotion ? "reduce" : "no-preference",
        serviceWorkers: "block",
      });
      await context.addInitScript(installHelpers);
      // Without --allow-remote, a request to another host is refused here first, with a
      // readable reason (ERR_BLOCKED_BY_CLIENT); the proxy above catches the rest.
      if (!opts.allowRemote) {
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          const network = url.protocol === "http:" || url.protocol === "https:";
          return network && !isLoopbackUrl(url.href)
            ? route.abort("blockedbyclient")
            : route.continue();
        });
      }
      try {
        if (target.signIn.length > 0) {
          const page = await context.newPage();
          try {
            await runSteps(page, base, target.signIn);
          } finally {
            await page.close();
          }
        }
        for (const route of routes) {
          for (const lang of target.languages) {
            const states = [
              null,
              ...target.states.filter((s) => !s.routes || s.routes.includes(route.id)),
            ];
            for (const state of states) {
              const id = unitId(route.id, width, lang.id, state?.id ?? null);
              const unit: Unit = {
                id,
                route: route.id,
                width,
                lang: lang.id,
                state: state?.id ?? null,
                url: withQuery(new URL(route.path, base).toString(), lang.query),
                shot: `shots/${id}.png`,
              };
              try {
                const result = await captureUnit(
                  context,
                  unit,
                  { lang: lang.steps ?? [], state: state?.steps ?? [] },
                  route.waitFor,
                  base,
                  opts.out,
                  opts.reducedMotion,
                );
                units.push(unit);
                axeOut[id] = result.axe;
                measureOut[id] = result.measure;
                consoleOut[id] = result.console;
                process.stdout.write(`captured ${id}\n`);
              } catch (error) {
                failed.push({ id, error: (error as Error).message.split("\n")[0] ?? "" });
                process.stderr.write(`failed ${id}: ${(error as Error).message}\n`);
              }
            }
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await cleanup();
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
  }

  const manifest: Manifest = {
    target: target.name,
    startedAt,
    endedAt: new Date().toISOString(),
    browser: { name: "chromium", version: browserVersion },
    playwright: playwrightVersion(),
    repo,
    options: {
      target: basename(opts.target),
      only: opts.only,
      reducedMotion: opts.reducedMotion,
      allowRemote: opts.allowRemote,
      viewportHeight: VIEWPORT_HEIGHT,
    },
    units,
    failed,
  };
  const write = (name: string, value: unknown) =>
    writeFile(join(opts.out, name), `${JSON.stringify(value, null, 2)}\n`);
  await write("axe.json", axeOut);
  await write("measure.json", measureOut);
  await write("console.json", consoleOut);
  await write("manifest.json", manifest);

  if (failed.length > 0) {
    process.stderr.write(`capture failed for: ${failed.map((f) => f.id).join(", ")}\n`);
    return 2;
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (error instanceof BadInput) process.stderr.write(`capture: ${error.message}\n`);
    else process.stderr.write(`capture: ${(error as Error).stack ?? String(error)}\n`);
    process.exit(2);
  },
);
