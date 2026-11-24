import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { parse, parseAllDocuments } from "yaml";
import { gallery, routeOf } from "../src/gallery.ts";

// The Maestro flow is not run here (it needs a simulator). This holds it to the gallery: it
// opens every entry by the app's own scheme and takes one screenshot of each.

const flowUrl = new URL("../.maestro/gallery.yaml", import.meta.url);
const appUrl = new URL("../app.json", import.meta.url);

test("the flow opens every gallery entry and takes a screenshot of it", async () => {
  const app = parse(await readFile(appUrl, "utf8")) as {
    expo: { scheme: string; ios: { bundleIdentifier: string } };
  };
  const [header, body] = parseAllDocuments(await readFile(flowUrl, "utf8")).map((doc) =>
    doc.toJS(),
  ) as [{ appId: string }, Record<string, unknown>[]];
  expect(header.appId).toBe(app.expo.ios.bundleIdentifier);

  const opened = new Map<string, string | undefined>();
  body.forEach((step, index) => {
    if (typeof step.openLink !== "string") return;
    const shot = body
      .slice(index + 1)
      .find((later) => "takeScreenshot" in later || "openLink" in later);
    opened.set(step.openLink, shot?.takeScreenshot as string | undefined);
  });

  const expected = gallery.flatMap(({ component, states }) =>
    states.map((state) => `${app.expo.scheme}://${routeOf(component, state).slice(1)}`),
  );
  expect([...opened.keys()].sort()).toEqual(expected.sort());
  for (const link of expected) {
    expect(opened.get(link), `no screenshot after ${link}`).toBeTruthy();
  }
});
