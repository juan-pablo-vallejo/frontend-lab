---
number: 30
name: Progress rings
classes: [functional-feedback, comprehension]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://developer.apple.com/design/human-interface-guidelines/progress-indicators
  - https://developer.android.com/develop/ui/compose/components/progress
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property
  - https://www.w3.org/WAI/ARIA/apg/patterns/meter/
  - https://react-aria.adobe.com/ProgressBar
  - https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/progress/
  - https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/progressview/
  - https://raw.githubusercontent.com/material-components/material-web/main/README.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (2 corrections applied).
---

# 30. Progress rings

Use a determinate circular ring only where space is compact, such as a per-row transfer or a step count in a card. Use a bar where width allows, and always pair the ring with text.

## Use when

- Per-item download or upload progress inside a list row or icon button.
- Step completion in a small card.
- A compact countdown.
- Apple: circular determinate indicators fill clockwise.

## Avoid when

- Where a linear bar fits: bars are easier to compare in tables of jobs (heuristic, no primary source opened).
- Quota, capacity, or score values: that is a meter (APG meter pattern), not progress.
- Morphing a spinner into a bar or a bar into a ring (Apple: do not switch from circular to bar style).
- M3 Expressive wavy rings in operational UI: Compose applies constant wave motion even when determinate unless `waveSpeed` is `0.dp`.

## Web technique

1. An SVG `<circle>` with `stroke-dasharray` equal to the circumference and `stroke-dashoffset` transitioned (repaints a small area, acceptable), rotated `-90deg` so it starts at 12 o'clock, plus a `<text>` or adjacent percentage.
2. Alternatively a `conic-gradient` with a registered `@property --p <percentage>` (Baseline 2024, newly available; repaints).
3. Wrap it in `role=progressbar` semantics or a hidden `<progress>`. Never animate `width`, `height`, or `r`. No library needed.

## Native technique

- Platform look on iOS: `@expo/ui/swift-ui` `ProgressView` with `progressViewStyle('circular')` (fixed size).
- Platform look on Android: `@expo/ui/jetpack-compose` `CircularProgressIndicator` (`progress` 0 to 1). Avoid `CircularWavyProgressIndicator`, or set `waveSpeed={0}`.
- Custom: react-native-svg `Circle` with Reanimated `useAnimatedProps` on `strokeDashoffset`.
- Haptic: only `notificationAsync(Success)` or `(Error)` at completion of a transfer the user is watching.

## Timing

- Arc tween 150 to 300 ms ease-out between real updates.
- Indeterminate rotation about 1 to 1.5 s, linear.
- No overshoot springs: an arc past the real value misreports progress.

## Accessibility

- `role=progressbar` with `aria-label` (file or step name), `aria-valuenow`, min and max, or `aria-valuetext` ("Step 2 of 5"); the inner percentage text is then presentational.
- Arc against track contrast 3:1 (WCAG 1.4.11) unless the same value is in text.
- Announce completion via `role=status`.
- WCAG 4.1.3, 1.4.11.
- RN: `accessibilityRole='progressbar'`, `accessibilityValue` `{min:0,max:100,now}` or `{text}`, `accessibilityLabel`.

## Reduced motion

- The arc jumps to each new value without a tween.
- Indeterminate rotation becomes a static partial arc plus text ("Waiting…").
- The numeric label inside or beside the ring carries the progress information.

## Keyboard

Not applicable to the ring (display only). If the ring sits inside a Cancel or Stop icon button, that button needs Enter/Space and an accessible name separate from the progress value.

## Performance

- `stroke-dashoffset` and `conic-gradient` changes repaint the ring (not compositor). Fine at icon size, but throttle to `requestAnimationFrame` in lists of many rows.
- Indeterminate rings rotate the whole SVG via `transform`.
- RN: keep the animation on the UI thread via Reanimated; avoid re-rendering list rows per progress event.

## Primitives to reuse

- Web: React Aria `ProgressBar` (docs: use SVG within `ProgressBar` for a circular indicator). Material Web `md-circular-progress` only with caution (README: maintenance mode pending new maintainers).
- Native: `@expo/ui` `ProgressView` circular (iOS), `CircularProgressIndicator` (Android); react-native-svg plus Reanimated.

## Tests

- valuenow matches the source and is monotonic; the accessible name is present.
- Under reduced motion there is no running animation.
- The computed `strokeDashoffset` corresponds to the value (within a tolerance).
- At 100% it shows a completion state only after confirmation.
- Visual QA: starts at 12 o'clock, fills clockwise, label legible at small sizes, arc against track contrast, no clipping of the stroke cap.

## State integrity

Same as progress bars: show real measured progress only. A full ring is not success until the operation is confirmed. Switch to a distinct "processing" state, then a check mark on server confirmation, or an error state with Retry.

## References

- [Apple HIG: progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)
- [Android: Compose progress indicators](https://developer.android.com/develop/ui/compose/components/progress)
- [MDN: @property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property)
- [APG: meter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/meter/)
- [React Aria ProgressBar](https://react-aria.adobe.com/ProgressBar)
- [Expo UI: Jetpack Compose progress](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/progress/)
- [Expo UI: SwiftUI ProgressView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/progressview/)
- [Material Web README](https://raw.githubusercontent.com/material-components/material-web/main/README.md)

## Not verified

- "A hidden `<progress>`" should mean visually hidden, not the `hidden` attribute or `display: none` (which remove it from the accessibility tree); not checked against a source.
- Material Web status is ambiguous: the README states maintenance mode, yet npm shows 2.5.0 published 2026-11-21 and the repository was pushed 2026-11-24.
- The arc tween and rotation period have no primary source; only the NN/g figures were confirmed.
- `@property` is Baseline newly available (2024-07-09); the date it becomes widely available (about January 2027) is computed, not read from a source.
