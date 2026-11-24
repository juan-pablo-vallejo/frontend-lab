---
number: 4
name: Progress bars
classes: [functional-feedback, perceived-performance, comprehension]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role
  - https://www.nngroup.com/articles/progress-indicators/
  - https://developer.apple.com/design/human-interface-guidelines/progress-indicators
  - https://www.radix-ui.com/primitives/docs/components/progress
  - https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/progress/
  - https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/progressview/
  - https://raw.githubusercontent.com/material-components/material-web/main/README.md
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (4 corrections applied).
---

# 4. Progress bars

Use a determinate bar with a text count whenever work is measurable or may exceed 10 seconds. Advance it honestly, never backwards, and offer Cancel for long jobs.

## Use when

- Imports, exports, bulk updates, syncs of N records, file transfers, multi-step wizards.
- NN/g: percent-done for waits of 10 s or more, and for record sets even under 10 s, with text such as "Updating address 3 of 50".
- Apple: prefer determinate when possible, and switch from indeterminate to determinate as soon as the total is known.

## Avoid when

- Waits under about 1 s. Unmeasurable work, where a fake percentage would mislead: use an indeterminate bar or a list of steps instead (NN/g).
- A value inside a range that is not task completion (quota, fuel, stock level): that is a meter (APG meter pattern).
- Blocking repeated work: for long bulk jobs, let staff keep working and notify them on completion (NN/g, designing for waits).

## Web technique

1. Native `<progress value max>` with a `<label>` (Baseline widely available since 2015); remove the `value` attribute for indeterminate. Restyle with `appearance: none` plus `::-webkit-progress-value` and `::-moz-progress-bar`.
2. For custom fills, a full-width fill element with `transform: scaleX(fraction)` and a `transform-origin` on the inline-start side, transitioned on `transform`. Never animate `width` (layout). An `@property --progress <percentage>` gradient (Baseline 2024, newly available) works but repaints.
3. Indeterminate sweep: `translateX` keyframes on an inner bar. No library needed.

## Native technique

- Custom bar: a `View` track with `overflow: hidden` and an inner fill driven by Reanimated `useAnimatedStyle` on `transform` (`scaleX` or `translateX`) with `withTiming`, which runs on the UI thread. Core `Animated` cannot drive `width` with the native driver (RN Animations docs).
- iOS look: `@expo/ui/swift-ui` `ProgressView` with `value` 0 to 1, linear style, flexible width.
- Android look: `@expo/ui/jetpack-compose` exports `LinearProgressIndicator` (`progress` 0 to 1; omit for indeterminate) and `LinearWavyProgressIndicator` (set `waveSpeed={0}` for a static wave), inside a `Host`.
- Haptic: `Haptics.notificationAsync(Success)` once when a foreground job the user is watching completes, `(Error)` on failure; never per tick. On Android, Expo recommends `performAndroidHapticsAsync(Confirm/Reject)`.

## Timing

- Tween between reported values in 150 to 300 ms ease-out so jumps read as continuous (NN/g 100 to 500 ms range). Throttle displayed updates to a few per second.
- Apple warns against 90% in 5 s followed by a long tail; NN/g suggests starting slower and finishing faster rather than over-promising.
- Indeterminate sweep cycle about 1.5 to 2 s (heuristic).

## Accessibility

- `role=progressbar` (implicit on `<progress>`) with an accessible name, `aria-valuenow`, min and max. Use `aria-valuetext` for counts ("12 of 50 records" / "12 de 50 registros"). Omit valuenow when indeterminate.
- The descendants of a progressbar are presentational (MDN), so put Cancel outside it. Do not make the bar a live region that speaks every tick. Announce milestones and completion in a polite `role=status`, or with `document.ariaNotify` (MDN: Baseline 2026, newly available, so keep a live-region fallback).
- WCAG 4.1.3 (ARIA22, ARIA25, ARIA27); 1.4.11 (fill against track 3:1 unless the same information is in text); 2.2.2 only when an indeterminate animation starts automatically, runs over 5 s and sits beside other content. A bar started by the user's own action is outside 2.2.2.
- RN: `accessibilityRole='progressbar'`, `accessibilityValue={{min:0,max:100,now}}` (integers) or `{text:'12 of 50'}`, plus `announceForAccessibility` at milestones.

## Reduced motion

- Determinate: value changes jump without the tween; the bar plus the numeric text still carry all the information.
- Indeterminate: replace the moving sweep with a static partial or striped bar and visible text ("Processing… 2 min elapsed", or the current step name), so "not stalled" is conveyed by changing text instead of motion.
- RN: Reanimated `withTiming` returns the target value immediately under `ReduceMotion.System`.

## Keyboard

Not applicable to the bar itself (display only). An adjacent Cancel or Pause button must be reachable with Tab and activate with Enter or Space. If Cancel discards work, confirm it (Apple HIG).

## Performance

- `scaleX` is compositor-only; `width` or a gradient `@property` repaints.
- Progress events (XHR, fetch streams, expo-file-system `onProgress`) can fire faster than the display refreshes. Coalesce them to `requestAnimationFrame` or about 4 to 10 Hz before `setState` to avoid React re-render storms.
- In lists of many jobs, render one aggregate bar plus per-row text.

## Primitives to reuse

- Web: native `<progress>`; Radix Progress (`Root`/`Indicator`, `getValueLabel`, `data-state` `complete|indeterminate|loading`); React Aria `ProgressBar` (`valueLabel`, `formatOptions`). Material Web `md-linear-progress` only with caution (README: maintenance mode pending new maintainers).
- Native: `@expo/ui` `ProgressView` (iOS) and `LinearProgressIndicator` (Android, `@expo/ui/jetpack-compose`).

## Tests

- `aria-valuenow` is monotonic non-decreasing, stays within min and max, and the progressbar has a name; valuenow is absent when indeterminate.
- Announcements fire only at milestones and on completion (count live-region writes).
- Cancel aborts the request (`AbortController` or XHR `abort` called).
- Percentages are formatted per locale: in Node 24 Intl, `es` gives "42 %" with U+00A0 (not an ASCII space) and `es-MX` gives "42%". Assert against Intl output for the configured locale, not hard-coded strings.
- Visual QA: smooth fill with no backward jumps, fill and track contrast, the fill direction mirrors in RTL, longer Spanish labels do not truncate.

## State integrity

- The bar may show bytes or records actually processed, as reported.
- Reaching 100% of transfer is not success: show "Processing…" or "Verifying…" until the server confirms, then "Done" with results (counts created or failed, per NN/g).
- Never fabricate progress ahead of real events.
- On error, freeze the bar at the last real value in an error state with Retry; never animate it to full.

## References

- [MDN: the progress element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress)
- [MDN: progressbar role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role)
- [NN/g: progress indicators](https://www.nngroup.com/articles/progress-indicators/)
- [Apple HIG: progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)
- [Radix Progress](https://www.radix-ui.com/primitives/docs/components/progress)
- [Expo UI: Jetpack Compose progress](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/progress/)
- [Expo UI: SwiftUI ProgressView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/progressview/)
- [Material Web README](https://raw.githubusercontent.com/material-components/material-web/main/README.md)
- [WCAG 2.2 Understanding 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

## Not verified

- That React Aria `ProgressBar` omits `aria-valuenow` when indeterminate is inferred only from a CSS selector in its example; Radix docs do not state that `value=null` produces `data-state=indeterminate`.
- Material Web status is ambiguous: the README states maintenance mode, yet npm shows 2.5.0 published 2026-11-21 and the repository was pushed 2026-11-24.
- Whether `transform-origin` accepts logical keywords for the inline-start side (RTL mirroring); MDN `transform-origin` was not opened.
- The fill tween and sweep cycle have no primary source; only the NN/g figures were confirmed.
- WCAG techniques ARIA22, ARIA25 and ARIA27 were confirmed only by title; their contents were not opened.
- `@property` is Baseline newly available (2024-07-09); the date it becomes widely available (about January 2027) is computed, not read from a source.
- The Node 24 Intl percent output was checked by running Node locally, not against a published source.
