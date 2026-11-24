import { expect, test } from "@playwright/test";
import { color, type SemanticColor } from "../src/tokens.ts";
import { contrastRatio } from "./contrast.ts";

test("the helper reproduces known ratios", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  // #767676 on white is the usual 4.54:1 reference.
  expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
});

type Pair = { fg: SemanticColor; bg: SemanticColor; min: number };

const TEXT = 4.5;
const NON_TEXT = 3;
const surfaces = ["surface", "surfaceRaised"] as const;
const statuses = ["Ok", "Attention", "Problem"] as const;
const tints = statuses.map((s) => `status${s}Tint` as const);

// Every semantic foreground on every background it is meant to be drawn on. A tint is a
// background too: a message on a status tint (a refusal toast, say) carries text, an accent
// action such as Undo, a bordered close button and the focus ring around either.
const pairs: Pair[] = [
  ...[...surfaces, ...tints].flatMap((bg): Pair[] => [
    { fg: "text", bg, min: TEXT },
    { fg: "textMuted", bg, min: TEXT },
    { fg: "accent", bg, min: TEXT },
    { fg: "focusRing", bg, min: NON_TEXT },
    { fg: "border", bg, min: NON_TEXT },
  ]),
  ...surfaces.flatMap((bg) =>
    statuses.map((s): Pair => ({ fg: `status${s}`, bg, min: TEXT })),
  ),
  { fg: "onAccent", bg: "accent", min: TEXT },
  ...statuses.flatMap((s): Pair[] => [
    { fg: `onStatus${s}`, bg: `status${s}`, min: TEXT },
    { fg: `status${s}`, bg: `status${s}Tint`, min: TEXT },
  ]),
];

for (const { fg, bg, min } of pairs) {
  test(`${fg} on ${bg} reaches ${min}:1`, () => {
    const ratio = contrastRatio(color[fg], color[bg]);
    expect(
      ratio,
      `${color[fg]} on ${color[bg]} is ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(min);
  });
}

test("every semantic colour is in at least one checked pair", () => {
  const checked = new Set(pairs.flatMap(({ fg, bg }) => [fg, bg]));
  const unchecked = Object.keys(color).filter(
    (name) => !checked.has(name as SemanticColor),
  );
  expect(unchecked).toEqual([]);
});
