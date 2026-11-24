---
number: 42
name: Animated data visualizations
classes: [comprehension, decorative]
tier: rarely-justified
status: researched
date: 2026-11-23
sources:
  - https://recharts.github.io/en-US/api/Line/
  - https://nearform.com/open-source/victory-native/docs/animated-paths
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
  - https://developer.apple.com/design/human-interface-guidelines/charts
  - https://github.com/recharts/recharts/blob/main/src/cartesian/Bar.tsx
  - https://github.com/recharts/recharts/blob/main/src/cartesian/Line.tsx
  - https://github.com/recharts/recharts/blob/main/src/animation/JavascriptAnimate.tsx
  - https://www.w3.org/TR/wai-aria-1.2/#img
  - https://github.com/recharts/recharts/blob/main/src/container/RootSurface.tsx
  - https://github.com/recharts/recharts/blob/main/src/state/rootPropsSlice.ts
  - https://github.com/software-mansion/react-native-reanimated/blob/main/docs/docs-reanimated/docs/guides/accessibility.mdx
  - https://github.com/FormidableLabs/victory-native-xl/blob/main/website/docs/animated-paths.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 42. Animated data visualizations

Do not animate charts on load. Animate only a data change the user caused, briefly, and always state the change in text as well.

## Use when

- A user changes a filter, date range or series and needs to see which values rose or fell (Apple HIG: animating changes helps people notice them).
- A single highlighted transition between two states of the same chart.

## Avoid when

- Initial render and dashboard load: decorative, and it delays reading.
- Auto-refreshing live data that would animate continuously (WCAG 2.2.2).
- Charts that change point count: the paths cannot interpolate.
- Dense operational dashboards opened many times a day.

## Web technique

1. Render static SVG or canvas with a text summary and a data table alternative.
2. For a user-caused change, use CSS transitions on `transform` (`scaleY` with `transform-origin` at the baseline for bars) and `opacity`, or WAAPI. Do not animate the SVG path `d`, `width`, `height` or `x`/`y` on many nodes, which repaints.
3. Recharts 3.11: `isAnimationActive` defaults to `'auto'`, which is off during SSR and under `prefers-reduced-motion`. The default `animationDuration` is 1500 ms on Line, Area and Pie and 400 ms on Bar and Scatter; set about 300 ms for user-caused changes and `isAnimationActive={false}` for the initial render.

## Native technique

- Victory Native (43.1; Skia plus Reanimated) `useAnimatedPath` with type `'timing'`, only when the point count is unchanged (the docs say Skia can interpolate only paths with the same number of points); otherwise redraw instantly.
- `useAnimatedPath`'s timing config is Reanimated's `WithTimingConfig`, whose `reduceMotion` defaults to `ReduceMotion.System`, so the path jumps to its end value under Reduce Motion.
- `useReducedMotion` reports only the setting at app start; for custom gating read `AccessibilityInfo.isReduceMotionEnabled()`.
- No haptics, except an optional `selectionAsync` when scrubbing across discrete points.

## Timing

200–400 ms for a state change, with ease-out or Material standard `cubic-bezier(0.2,0,0,1)`. Never the 1–1.5 s library defaults. No staggered cascades in operational dashboards.

## Accessibility

- Non-interactive chart: `role='img'` with an `aria-label` stating the key message; with Recharts also set `accessibilityLayer={false}`, because `role='img'` makes descendants presentational and Recharts 3 turns its keyboard layer on by default.
- Interactive chart: keep the library's keyboard layer, give it an `aria-label`, and wrap it in `<figure>` with `<figcaption>` instead of `role='img'`.
- Always add the adjacent data table and text deltas ("+12% vs last week").
- Live charts: provide pause and stop controls (2.2.2) and do not announce every tick; announce only user-caused updates via `role=status`.
- WCAG 1.1.1, 1.4.1 (not colour alone), 1.4.11, 2.2.2, 2.3.3, 4.1.3.
- React Native: an `accessibilityLabel` with the summary on the chart `View`, and a "View data" list. Apple HIG recommends iOS Audio Graphs.

## Reduced motion

Render the final state immediately (Recharts `'auto'` and Reanimated `ReduceMotion.System` do this). The motion carried what changed, so convey it with persistent change markers: delta labels, a ghost or outline of the previous value, or bolded changed rows in the table.

## Keyboard

Not applicable to a static chart image. An interactive chart needs a logical focus path through series and points (Apple HIG), and pause/stop controls reachable by Tab, Enter and Space.

## Performance

SVG with hundreds of animated nodes is main-thread paint work; `transform` and `opacity` on groups are cheaper. Canvas or Skia avoids DOM cost. Pause animations and polling when the chart is off-screen or the app is backgrounded, to save battery on field phones.

## Primitives to reuse

- Web: Recharts (`isAnimationActive`, `animationDuration`, `accessibilityLayer`); a semantic `<table>` as the alternative; `<figure>` / `<figcaption>`.
- Native: Victory Native with Skia and Reanimated (`useAnimatedPath`); Reanimated `ReduceMotion.System`; `AccessibilityInfo.isReduceMotionEnabled()`.

## Tests

- Automated: the chart has an accessible name or summary and a data table equivalent; with reduced motion emulated, `isAnimationActive` resolves to false or the duration is 0; live charts expose a working pause control; delta text matches the data.
- Visual QA: no animation on first paint, the transition does not misrepresent intermediate values (bars should not cross zero spuriously), and the result is legible in grayscale.

## State integrity

Not applicable: the chart displays data and changes none.

## References

- https://recharts.github.io/en-US/api/Line/
- https://nearform.com/open-source/victory-native/docs/animated-paths
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- https://developer.apple.com/design/human-interface-guidelines/charts

## Not verified

- Apple HIG charts guidance: animating changes, Audio Graphs and the focus path.
- Bridging iOS Audio Graphs from React Native.
- Arrow-key traversal of chart points is a convention, not an APG pattern, and is not confirmed as a standard.
