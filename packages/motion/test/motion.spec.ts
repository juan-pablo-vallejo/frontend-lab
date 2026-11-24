import { expect, test } from "@playwright/test";
import { dampingRatio, durations, easingCurves, easings, springs } from "../src/index.ts";

test("no duration exceeds 500 ms", () => {
  for (const [name, ms] of Object.entries(durations)) {
    expect(Number.isInteger(ms), name).toBe(true);
    expect(ms, name).toBeGreaterThanOrEqual(0);
    expect(ms, name).toBeLessThanOrEqual(500);
  }
});

test("durations carry the agreed values", () => {
  expect(durations).toEqual({
    instant: 0,
    micro: 100,
    short: 150,
    shortLong: 200,
    mediumIn: 250,
    mediumOut: 200,
    long: 400,
  });
});

test("each easing's CSS string is generated from its control points", () => {
  expect(easings).toEqual({
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    enter: "cubic-bezier(0, 0, 0, 1)",
    exit: "cubic-bezier(0.3, 0, 1, 1)",
    linear: "linear",
  });
  expect(Object.keys(easingCurves)).toEqual(Object.keys(easings));
  for (const points of Object.values(easingCurves)) {
    expect(points).toHaveLength(4);
    const [x1, , x2] = points;
    // CSS requires both x control points within [0, 1].
    for (const x of [x1, x2]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
  }
});

test("every spring is critically damped: damping ratio 1", () => {
  const entries = Object.entries(springs);
  expect(entries.length).toBeGreaterThanOrEqual(2);
  expect(entries.length).toBeLessThanOrEqual(3);
  for (const [name, spring] of entries) {
    // Written out here rather than trusting the package's helper alone.
    const ratio = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
    expect(ratio, name).toBeCloseTo(1, 10);
    expect(dampingRatio(spring), name).toBeCloseTo(1, 10);
  }
});
