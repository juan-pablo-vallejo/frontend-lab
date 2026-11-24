---
number: 3
name: Loading spinners
classes: [functional-feedback, perceived-performance]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.nngroup.com/articles/progress-indicators/
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
  - https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - https://developer.apple.com/design/human-interface-guidelines/progress-indicators
  - https://reactnative.dev/docs/activityindicator
  - https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/
  - https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/packages/react-native-reanimated/src/animation/repeat.ts
  - https://raw.githubusercontent.com/web-platform-tests/wpt/master/html/interaction/focus/sequential-focus-navigation-after-disabled.html
  - https://raw.githubusercontent.com/material-components/material-web/main/README.md
  - https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/progress/
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (5 corrections applied).
---

# 3. Loading spinners

Show an indeterminate spinner only for waits of about 1 to 10 seconds with unknown length, placed on the thing that is waiting. Under 1 second, show only a static pending state, no spinner; past 10 seconds, a percent-done indicator.

## Use when

- A button submit, a card or panel refetch, or a lookup takes about 1 to 10 seconds and progress cannot be measured.
- NN/g recommends looped animation for 2 to 10 seconds, and spinners for a single module.
- Apple prefers spinners for background work, constrained spaces, and next to a control.

## Avoid when

- Responses under about 1 second (NN/g: a looped animation distracts there).
- Waits over 10 seconds or batch jobs: they need a percent-done or "n of N" count.
- Full-page first loads with a known layout: consider a skeleton.
- A full-screen blocking overlay in all-day operational software: it stops the next repeated action. Keep the spinner inside the button or region and leave the rest of the UI usable.

## Web technique

1. Keep the native `<button>` and swap a visually hidden status text ("Saving…" / "Guardando…") into a `role=status` region. For a loading region, use `<progress>` without a `value` attribute (indeterminate, matches `:indeterminate`) or an element with `role=progressbar` and no `aria-valuenow`.
2. A CSS `@keyframes` rotation on `transform` only, using an SVG or border-arc glyph. Fade in on `opacity`, with `@starting-style` for a CSS-only entry.
3. Never animate `width`, `height`, `margin`, or `top`/`left`. Animating SVG `stroke-dasharray` repaints every frame, so keep any such spinner small. No library needed.

## Native technique

- Core `<ActivityIndicator>` (native `UIActivityIndicatorView` / Android `ProgressBar`, animated natively off the JS thread). Size `'small'` inline, `'large'` only for a whole-region load.
- Expo UI (SDK 58) also offers SwiftUI `ProgressView` (iOS) and the M3 Expressive Jetpack Compose `LoadingIndicator` (Android) for the platform-native look.
- No haptic when a spinner starts; at most `notificationAsync(Error)` if the action fails.

## Timing

- Acknowledge the press at once with a static pending state (label change).
- Start the looped animation only after about 1 s (NN/g: under 1 s it distracts).
- Minimum-visible times are heuristics. They must never postpone the result or keep the control locked once the response arrives. Rotation 0.8 to 1.2 s, linear. Fades 100 to 150 ms.

## Accessibility

- Give the indicator an accessible name (`aria-label` "Loading orders") with `role=progressbar` and no `aria-valuenow`, or keep it `aria-hidden` and put the text in `role=status` (polite).
- Set `aria-busy=true` on the loading region and back to `false` when done; MDN notes it must be reset. WCAG 4.1.3 asks for a status message for busy states; the Understanding doc suggests a "ready" message once a busy state ends.
- WCAG 2.2.2 applies only when the spinner starts automatically (page load, background refetch), runs over 5 s and sits beside other content: then offer pause/stop/hide, or stop the motion and keep the text. A spinner started by the user's own button press is outside 2.2.2.
- RN: `accessibilityRole='progressbar'`, `accessibilityLabel`, `accessibilityState={{busy:true}}` on the container, and `AccessibilityInfo.announceForAccessibility` on completion or error. The RN `ActivityIndicator` docs give no default accessibility semantics, so set them explicitly.

## Reduced motion

- Web: swap the rotation for a static glyph (an hourglass or a partial arc) plus visible text ("Saving…", "Loading 3 rows…"), or a slow opacity pulse; WCAG 2.3.3 excludes opacity-only changes from motion. The text carries the "still working" information the motion carried.
- RN: under `ReduceMotion.System` a reversed infinite `withRepeat` does not start; a non-reversed one runs once, with `withTiming` jumping to `toValue`, so the glyph ends static either way. Branch explicitly (`useReducedMotion`, or `AccessibilityInfo.isReduceMotionEnabled` plus `reduceMotionChanged`) and render a static glyph with text.

## Keyboard

Not applicable to the indicator. Keep focus on the trigger: use `aria-disabled` and ignore repeat activation instead of the `disabled` attribute, because disabling a focused button removes focus from it (HTML focus fixup rule; the web-platform test asserts `document.activeElement` is no longer the button).

## Performance

- A transform-only rotation runs on the compositor. Avoid `filter`, `box-shadow`, or stroke animation on large elements.
- Unmount or pause offscreen spinners. Dozens of animating spinners in a virtualized list waste battery: use one per region.
- RN: a long-running `Animated.loop` should use `useNativeDriver: true` and `isInteraction: false` so it does not block `VirtualizedList` rendering (RN Animations docs).

## Primitives to reuse

- Web: native `<progress>` without a value; React Aria `ProgressBar` with `isIndeterminate`. Material Web `md-circular-progress` only with caution: its README says the library is in maintenance mode pending new maintainers.
- Native: core `ActivityIndicator`; `@expo/ui` `ProgressView` (iOS), `LoadingIndicator` or `CircularProgressIndicator` (Android), each inside a `Host`.

## Tests

- With fake timers, the indicator does not render if the response arrives before the delay threshold.
- Once shown it has `role=progressbar` or `status`, an accessible name, and no `aria-valuenow`.
- `aria-busy` on the region returns to `false` on success and on error.
- Under emulated `prefers-reduced-motion`, `element.getAnimations()` shows no transform animation and the text label is visible.
- A second click while pending sends no second request.
- Visual QA: the button keeps its width when the label becomes "Guardando…", no layout shift, arc contrast at least 3:1 against the background, no flash on fast responses.

## State integrity

- Before confirmation, show only "request in flight" (spinner plus "Saving…").
- Never show a success check, an updated value, or "Saved" until the server responds 2xx.
- On failure, replace the spinner with an error that keeps the user's input. Per NN/g, show that the first click was accepted rather than warning "don't click twice".

## References

- [NN/g: progress indicators](https://www.nngroup.com/articles/progress-indicators/)
- [WCAG 2.2 Understanding 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [WCAG 2.2 Understanding 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [Apple HIG: progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)
- [React Native: ActivityIndicator](https://reactnative.dev/docs/activityindicator)
- [Reanimated: accessibility guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)
- [Reanimated source: repeat.ts](https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/packages/react-native-reanimated/src/animation/repeat.ts)
- [Web-platform test: focus after disabled](https://raw.githubusercontent.com/web-platform-tests/wpt/master/html/interaction/focus/sequential-focus-navigation-after-disabled.html)
- [Material Web README](https://raw.githubusercontent.com/material-components/material-web/main/README.md)
- [Expo UI: Jetpack Compose progress](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/progress/)

## Not verified

- Whether core `ActivityIndicator` honours the OS reduce-motion setting on iOS or Android; the RN 0.88 page says nothing about accessibility, reduce motion or native implementation.
- That React Aria `ProgressBar` omits `aria-valuenow` when indeterminate is inferred only from a CSS selector in its example (`:not([aria-valuenow])`).
- Material Web status is ambiguous: the README states maintenance mode, yet npm shows 2.5.0 published 2026-11-21 and the repository was pushed 2026-11-24.
- The minimum display time, rotation period and fade durations have no primary source; only the NN/g figures (100 ms simple feedback, under 1 s no looped animation, 2 to 10 s looped animation, 10 s percent-done) were confirmed.
- Apple HIG also advises against labelling a spinning indicator (macOS section), which mildly conflicts with always pairing a spinner with visible text; a judgement call.
- `@starting-style` is Baseline newly available (2024-08-06); the date it becomes widely available (about February 2027) is computed, not read from a source.
