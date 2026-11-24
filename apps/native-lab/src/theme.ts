// The values of packages/tokens this app uses, copied under the same names, so Metro never has
// to resolve a workspace package. test/theme.spec.ts fails when any of them drifts from the
// source. Lengths are density-independent points.

export const palette = {
  accent: {
    "50": "#edf3ff",
    "700": "#1a4ea8",
  },
} as const;

export const color = {
  text: "#171a1f",
  textMuted: "#535b68",
  surface: "#ffffff",
  surfaceRaised: "#f6f7f9",
  border: "#6b7482",
  accent: "#2160d0",
  onAccent: "#ffffff",
  statusOk: "#1a6e38",
  statusOkTint: "#e9f6ed",
  statusAttention: "#8f5300",
  statusAttentionTint: "#fff4dc",
} as const;

export const space = {
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "6": 24,
} as const;

export const radius = {
  md: 8,
  full: 9999,
} as const;

export const type = {
  sm: { size: 14, lineHeight: 20 },
  md: { size: 16, lineHeight: 24 },
  lg: { size: 20, lineHeight: 28 },
} as const;

/** The width of a drawn line: a control border, a divider. */
export const borderWidth = 1;

/** Minimum size of a touch target, in points. */
export const target = 44;

/** Each status chip's word and icon colour on its fill. */
export const chipColors = {
  saved: { fg: palette.accent["700"], bg: palette.accent["50"] },
  sending: { fg: color.textMuted, bg: color.surfaceRaised },
  sent: { fg: color.statusOk, bg: color.statusOkTint },
  attention: { fg: color.statusAttention, bg: color.statusAttentionTint },
} as const;
