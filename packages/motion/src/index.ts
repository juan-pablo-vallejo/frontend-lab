// Motion tokens: data only. Web reads them as CSS custom properties (packages/tokens writes
// them into tokens.css); native code reads the numbers below.

/** Durations in milliseconds. None exceeds 500. */
export const durations = {
  instant: 0,
  micro: 100,
  short: 150,
  shortLong: 200,
  mediumIn: 250,
  mediumOut: 200,
  long: 400,
} as const;

export type DurationName = keyof typeof durations;

/** Cubic Bézier control points [x1, y1, x2, y2], for native easing functions. */
export const easingCurves = {
  standard: [0.2, 0, 0, 1],
  enter: [0, 0, 0, 1],
  exit: [0.3, 0, 1, 1],
  linear: [0, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type EasingName = keyof typeof easingCurves;

function cssEasing(name: EasingName): string {
  if (name === "linear") return "linear";
  return `cubic-bezier(${easingCurves[name].join(", ")})`;
}

/** The same curves as CSS easing functions. */
export const easings = Object.fromEntries(
  (Object.keys(easingCurves) as EasingName[]).map((name) => [name, cssEasing(name)]),
) as Record<EasingName, string>;

export type Spring = {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
};

/**
 * Damping ratio ζ = damping / (2 · √(stiffness · mass)).
 * ζ = 1 is critical damping: the fastest settle with no overshoot.
 */
export function dampingRatio({ stiffness, damping, mass }: Spring): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/**
 * Critically damped presets: damping = 2 · √(stiffness · mass), so ζ = 1.
 * Stiffness is chosen as a perfect square so the damping is a whole number.
 */
export const springs = {
  snappy: { stiffness: 400, damping: 40, mass: 1 },
  standard: { stiffness: 225, damping: 30, mass: 1 },
  gentle: { stiffness: 100, damping: 20, mass: 1 },
} as const satisfies Record<string, Spring>;

export type SpringName = keyof typeof springs;
