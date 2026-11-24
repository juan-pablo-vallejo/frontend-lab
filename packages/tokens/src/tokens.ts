// The one source of the lab's reference tokens. Two outputs read it: tokens.css (written by
// scripts/generate.ts) for the web, and any native theme, which imports or mirrors these
// values. Primitives hold raw values; semantic tokens point at primitives by name.
// Lengths are numbers in px (CSS px, React Native density-independent points).

import { durations, easingCurves, easings, springs } from "@frontend-lab/motion";

// ---- Primitives ------------------------------------------------------------------------------

export const palette = {
  neutral: {
    "0": "#ffffff",
    "50": "#f6f7f9",
    "100": "#eceef2",
    "200": "#d8dce3",
    "300": "#b8bfca",
    "400": "#8b94a3",
    "500": "#6b7482",
    "600": "#535b68",
    "700": "#3e4550",
    "800": "#2a2f37",
    "900": "#171a1f",
  },
  accent: {
    "50": "#edf3ff",
    "100": "#d6e4ff",
    "600": "#2160d0",
    "700": "#1a4ea8",
  },
  ok: {
    "50": "#e9f6ed",
    "500": "#2f9a55",
    "700": "#1a6e38",
  },
  attention: {
    "50": "#fff4dc",
    "500": "#d08a00",
    "700": "#8f5300",
  },
  problem: {
    "50": "#fdecec",
    "500": "#e0444b",
    "700": "#b3232b",
  },
} as const;

export type PaletteFamily = keyof typeof palette;
export type PaletteRef = {
  [F in PaletteFamily]: `${F}.${keyof (typeof palette)[F] & string}`;
}[PaletteFamily];

/** Spacing on a 4 px grid: space[n] = n × 4 px. */
export const space = {
  "0": 0,
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "10": 40,
  "12": 48,
  "16": 64,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

/** Type sizes with their line heights, in px. CSS writes them in rem (16 px = 1rem). */
export const type = {
  xs: { size: 12, lineHeight: 16 },
  sm: { size: 14, lineHeight: 20 },
  md: { size: 16, lineHeight: 24 },
  lg: { size: 20, lineHeight: 28 },
  xl: { size: 24, lineHeight: 32 },
  xxl: { size: 32, lineHeight: 40 },
} as const;

export type ShadowLayer = {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: string;
};

/** Shadows as layers, so a native theme can map them to its own shadow properties. */
export const shadow = {
  sm: [{ x: 0, y: 1, blur: 2, spread: 0, color: "rgb(23 26 31 / 0.12)" }],
  md: [
    { x: 0, y: 2, blur: 6, spread: 0, color: "rgb(23 26 31 / 0.12)" },
    { x: 0, y: 1, blur: 2, spread: 0, color: "rgb(23 26 31 / 0.08)" },
  ],
  lg: [
    { x: 0, y: 8, blur: 24, spread: 0, color: "rgb(23 26 31 / 0.16)" },
    { x: 0, y: 2, blur: 6, spread: 0, color: "rgb(23 26 31 / 0.08)" },
  ],
} as const satisfies Record<string, readonly ShadowLayer[]>;

/** The width of a drawn line: a control border, a divider. */
export const borderWidth = 1;

/** The widest a contained surface grows, in px, so a line of its text stays readable. */
export const width = {
  /** A transient message such as a toast. */
  message: 400,
  /** A panel holding a field and its results, such as a command list. */
  panel: 480,
} as const;

/** Stacking layers (z-index), lowest first. */
export const layer = {
  base: 0,
  raised: 1,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  toast: 1400,
} as const;

/** Breakpoints: the minimum viewport width, in px, at which each range begins. */
export const breakpoints = {
  sm: 600,
  md: 840,
  lg: 1200,
} as const;

// ---- Semantic --------------------------------------------------------------------------------

/** Semantic colours, each pointing at a primitive. */
export const semanticColor = {
  text: "neutral.900",
  textMuted: "neutral.600",
  surface: "neutral.0",
  surfaceRaised: "neutral.50",
  /** The border of a control (field, checkbox): 3:1 against its surface. */
  border: "neutral.500",
  accent: "accent.600",
  onAccent: "neutral.0",
  statusOk: "ok.700",
  onStatusOk: "neutral.0",
  statusOkTint: "ok.50",
  statusAttention: "attention.700",
  onStatusAttention: "neutral.0",
  statusAttentionTint: "attention.50",
  statusProblem: "problem.700",
  onStatusProblem: "neutral.0",
  statusProblemTint: "problem.50",
  /**
   * The same colour as `accent` (1.00:1 on an accent fill, 1.10:1 on statusOk), so it is
   * visible only when drawn outside the control at `focusRing.offset`, on the surrounding
   * surface. Components must keep that offset on filled controls.
   */
  focusRing: "accent.600",
} as const satisfies Record<string, PaletteRef>;

export type SemanticColor = keyof typeof semanticColor;

export function resolve(ref: PaletteRef): string {
  const [family, step] = ref.split(".") as [PaletteFamily, string];
  const value = (palette[family] as Record<string, string>)[step];
  if (value === undefined) throw new Error(`unknown palette reference: ${ref}`);
  return value;
}

/** Semantic colours resolved to their values. */
export const color = Object.fromEntries(
  (Object.keys(semanticColor) as SemanticColor[]).map((name) => [
    name,
    resolve(semanticColor[name]),
  ]),
) as Record<SemanticColor, string>;

export const focusRing = { width: 2, offset: 2 } as const;

/** Minimum size of a pointer or touch target, in px. */
export const target = 44;

export const motion = { durations, easings, easingCurves, springs } as const;
