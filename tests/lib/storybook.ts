// The static story build, served on loopback by the repository's own server, and the helpers
// the tests share to open one story and wait until it has finished rendering.

import { expect, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveFolder, type StaticServer } from "../../scripts/lib/server.ts";

export const buildDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../apps/web-lab/storybook-static",
);

export async function serveStories(): Promise<StaticServer> {
  if (!existsSync(join(buildDir, "index.json"))) {
    throw new Error("no story build: run pnpm build:stories first");
  }
  return serveFolder(buildDir);
}

export type StoryEntry = { id: string; title: string; name: string };

// index.json is read synchronously at collection time, so each story becomes its own test.
// A missing build gives no stories here; each spec also asserts the list is not empty.
export function storyIndex(): StoryEntry[] {
  const file = join(buildDir, "index.json");
  if (!existsSync(file)) return [];
  const index = JSON.parse(readFileSync(file, "utf8")) as {
    entries: Record<string, StoryEntry & { type: string }>;
  };
  return Object.values(index.entries)
    .filter((entry) => entry.type === "story")
    .map(({ id, title, name }) => ({ id, title, name }));
}

// Storybook announces on its channel that a story has finished: rendered, its play function
// run, its animations settled. The page catches that announcement from its first script on,
// so it is never missed, and the test fails when the story itself failed. The channel global
// and the event name ("storyFinished") are the pinned Storybook's own (storybook 10.6.8,
// dist/core-events and dist/preview/runtime.js): a version change is checked against them.
const watched = new WeakSet<Page>();

async function watchStories(page: Page) {
  if (watched.has(page)) return;
  watched.add(page);
  await page.addInitScript(() => {
    type Channel = { on: (event: string, listener: (payload: unknown) => void) => void };
    const w = window as unknown as { __labStoryFinished?: unknown };
    let channel: Channel | undefined;
    Object.defineProperty(window, "__STORYBOOK_ADDONS_CHANNEL__", {
      configurable: true,
      get: () => channel,
      set: (value: Channel) => {
        channel = value;
        value.on("storyFinished", (payload) => {
          w.__labStoryFinished = payload;
        });
      },
    });
  });
}

export async function openStory(page: Page, baseUrl: string, id: string, width = 1280) {
  await watchStories(page);
  await page.setViewportSize({ width, height: 800 });
  await page.goto(`${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`);
  const finished = page.waitForFunction(
    () => (window as unknown as { __labStoryFinished?: unknown }).__labStoryFinished,
    undefined,
    { timeout: 15_000 },
  );
  const payload = (await (await finished).jsonValue()) as {
    storyId: string;
    status: string;
  };
  expect(payload, `story ${id} finishes without error`).toEqual(
    expect.objectContaining({ storyId: id, status: "success" }),
  );
}
