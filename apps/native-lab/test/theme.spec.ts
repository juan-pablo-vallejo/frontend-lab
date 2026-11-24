import { expect, test } from "@playwright/test";
import * as tokens from "@frontend-lab/tokens";
import { contrastRatio } from "../../../packages/tokens/test/contrast.ts";
import * as theme from "../src/theme.ts";
import { chipColors } from "../src/theme.ts";

// The app mirrors the token values it needs instead of importing the workspace package, so
// Metro never has to resolve it. Every value the mirror holds must equal the value at the
// same path in packages/tokens.

const mirrored = {
  palette: theme.palette,
  color: theme.color,
  space: theme.space,
  radius: theme.radius,
  type: theme.type,
  borderWidth: theme.borderWidth,
  target: theme.target,
};

function leaves(value: unknown, path: string[] = []): [string[], unknown][] {
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => leaves(child, [...path, key]));
  }
  return [[path, value]];
}

function at(root: unknown, path: string[]): unknown {
  let node = root;
  for (const key of path) {
    if (node === null || typeof node !== "object" || !(key in node)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

test("the mirror holds values", () => {
  expect(leaves(mirrored).length).toBeGreaterThan(20);
});

for (const [path, value] of leaves(mirrored)) {
  test(`theme ${path.join(".")} equals packages/tokens`, () => {
    expect(
      at(tokens, path),
      `packages/tokens has no ${path.join(".")}`,
    ).not.toBeUndefined();
    expect(value).toBe(at(tokens, path));
  });
}

// A status chip draws its word and its icon in `fg` on `bg`: both are text, 4.5:1.
for (const [state, { fg, bg }] of Object.entries(chipColors)) {
  test(`status chip ${state}: word and icon reach 4.5:1`, () => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
}

test("the pressable's pressed and disabled looks keep their text at 4.5:1", () => {
  expect(
    contrastRatio(theme.color.onAccent, theme.palette.accent["700"]),
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    contrastRatio(theme.color.textMuted, theme.color.surfaceRaised),
  ).toBeGreaterThanOrEqual(4.5);
});
