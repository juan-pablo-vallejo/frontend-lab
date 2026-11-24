import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { durations, easings } from "@frontend-lab/motion";
import { renderCss } from "../src/css.ts";
import {
  borderWidth,
  breakpoints,
  color,
  motion,
  palette,
  semanticColor,
  space,
  target,
  width,
} from "../src/tokens.ts";

const cssFile = new URL("../tokens.css", import.meta.url);

test("the committed tokens.css is what the generator writes", async () => {
  const committed = await readFile(cssFile, "utf8");
  expect(committed, "run: pnpm --filter @frontend-lab/tokens generate").toBe(renderCss());
});

test("no custom property is declared twice", () => {
  const names = [...renderCss().matchAll(/^\s*(--lab-[\w-]+):/gm)].map((m) => m[1]);
  expect(names.length).toBeGreaterThan(0);
  expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
});

test("every semantic colour points at a primitive and resolves to it", () => {
  for (const [name, ref] of Object.entries(semanticColor)) {
    const [family, step] = ref.split(".") as [keyof typeof palette, string];
    const value = (palette[family] as Record<string, string>)[step];
    expect(value, `${name} -> ${ref}`).toBeDefined();
    expect(color[name as keyof typeof color]).toBe(value);
  }
});

test("semantic colours are written in CSS as references to primitives", () => {
  const css = renderCss();
  expect(css).toContain("--lab-text: var(--lab-neutral-900);");
  expect(css).toContain("--lab-status-ok-tint: var(--lab-ok-50);");
  expect(css).toContain("--lab-neutral-900: #");
});

test("spacing steps are on the 4 px grid", () => {
  for (const [name, px] of Object.entries(space)) {
    expect(px % 4, `space ${name}`).toBe(0);
    expect(px, `space ${name}`).toBe(Number(name) * 4);
  }
});

test("the target size is 44 px", () => {
  expect(target).toBe(44);
  expect(renderCss()).toContain("--lab-target: 44px;");
});

test("motion comes from packages/motion, in TypeScript and in CSS", () => {
  expect(motion.durations).toBe(durations);
  expect(motion.easings).toBe(easings);
  const css = renderCss();
  for (const [name, ms] of Object.entries(durations)) {
    const kebab = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    expect(css).toContain(`--lab-duration-${kebab}: ${ms}ms;`);
  }
  for (const [name, value] of Object.entries(easings)) {
    expect(css).toContain(`--lab-easing-${name}: ${value};`);
  }
});

test("line and surface widths are written in CSS, surfaces on the 4 px grid", () => {
  const css = renderCss();
  expect(borderWidth).toBe(1);
  expect(css).toContain("--lab-border-width: 1px;");
  for (const [name, px] of Object.entries(width)) {
    expect(px % 4, `width ${name}`).toBe(0);
    expect(css).toContain(`--lab-width-${name}: ${px}px;`);
  }
});

test("breakpoints rise", () => {
  const values = Object.values(breakpoints);
  expect(values).toEqual([...values].sort((a, b) => a - b));
});
