---
number: 18
name: Range sliders
classes: [functional-feedback, comprehension]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/slider/
  - https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
  - https://www.nngroup.com/articles/gui-slider-controls/
  - https://developer.apple.com/design/human-interface-guidelines/sliders
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range
  - https://api.webstatus.dev/v1/features?q=name:vertical
  - https://bcd.developer.mozilla.org/bcd/api/v0/current/html.elements.input.type_range.json
  - https://raw.githubusercontent.com/callstack/react-native-slider/main/README.md
  - https://raw.githubusercontent.com/expo/expo/sdk-58/packages/expo/bundledNativeModules.json
  - https://raw.githubusercontent.com/facebook/react-native-website/main/docs/accessibility.md
  - https://raw.githubusercontent.com/facebook/react-native-website/main/website/versioned_docs/version-0.88/accessibility.md
  - https://raw.githubusercontent.com/facebook/react-native/0.89-stable/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/ReactAccessibilityDelegate.kt
  - https://unpkg.com/@react-native-community/slider@5.2.1/README.md
  - https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal.md
  - https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/slider.md
  - https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/slider.md
  - https://raw.githubusercontent.com/software-mansion/react-native-gesture-handler/main/packages/docs-gesture-handler/docs/fundamentals/reanimated-interactions.mdx
  - https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-worklets/docs/threading/runOnJS.mdx
  - https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
  - https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sliders.json
  - https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (7 corrections applied).
---

# 18. Range sliders

Use a slider only when an approximate value within a bounded range is good enough. The thumb tracks the pointer exactly, the value is always visible, and a typed or tap alternative exists.

## Use when

Approximate filters (price or time windows), live-preview adjustments (opacity, zoom), and settings where seeing the effect while dragging helps (HIG: live feedback). Two-thumb sliders suit min–max filters.

## Avoid when

When the exact value matters (quantities, weights, times in forms), for wide ranges with fine steps, and for one-handed or gloved field use where accidental nudges happen (NN/g): use a numeric input or stepper instead. Sliders take longer to complete and may increase non-response (MeasuringU).

## Web technique

1. Native `<input type="range">` (Baseline widely available) with a `<label>` and an `<output>` showing the value; `list` plus `<datalist>` for ticks.
2. Vertical slider: `writing-mode: vertical-lr` (Chrome 124, Firefox 120, Safari 16.5); vertical-form-controls is Baseline newly available since April 2024. Datalist tick marks render in Firefox only from version 109; Safari shows no tick labels.
3. Style with `::-webkit-slider-thumb`, `::-moz-range-thumb` and `accent-color`.
4. Two thumbs: Radix Slider or React Aria Slider.
5. While dragging, apply no transition: the thumb follows the pointer. On track click or keyboard, transition `transform` only. Never animate `left` or `width` of the fill; use `transform: scaleX` on it.

## Native technique

- `@react-native-community/slider`: Expo SDK 58 bundles 5.2.1, which is single-value only and offers `step`, `StepMarker`, `renderStepNumber` and `onSlidingStart`/`onSlidingComplete`. On iOS set `tapToSeek` (default false) so a track tap exists as the non-drag alternative.
- `@expo/ui` Slider (universal, rendered inside `Host`, and `@expo/ui/community/slider`) exposes `onValueChange` only, with no `onSlidingComplete`, so debounce the commit.
- Two thumbs: `@callstack/slider` v6 (ranged, `valueLeft`/`valueRight`, `stepMarkers`, for RN 0.85 and later). It is not Expo-bundled; verify it in a dev build.
- Custom sliders use Gesture Handler 3 `usePanGesture` plus `useTapGesture` (callbacks run on the UI thread with Reanimated) and still expose `accessibilityRole='adjustable'`. Inside the worklets, call haptics and setState through `scheduleOnRN` from `react-native-worklets`; `runOnJS` is deprecated.
- Haptics: on Android `performAndroidHapticsAsync(Segment_Tick)` when crossing a step; on iOS `Haptics.selectionAsync` per detent. Never continuous.

## Timing

The thumb follows the pointer with no added latency. Keyboard or track-tap moves take 100–150 ms with standard easing. The value label updates every frame without tweening the number.

## Accessibility

- Native range, or `role=slider` with `aria-valuenow`/`min`/`max`, `aria-valuetext` for units ("€40", "3:15 pm"), and `aria-orientation` when vertical (APG).
- Two-thumb sliders (APG multi-thumb pattern): each thumb is its own `role=slider` tab stop with its own label ("Minimum price"); tab order stays fixed; each thumb's `aria-valuemin` or `aria-valuemax` updates as the other thumb moves. APG warns that touch screen readers may not operate ARIA sliders: test on devices and keep the adjacent text fields.
- 2.5.7 (AA) requires a single-pointer alternative: tapping the track or an adjacent text field. 1.4.11 needs 3:1 for thumb and track; 2.5.8 targets apply.
- Put labels and value above or beside the track, not below it, where a finger covers them (NN/g).
- RN 0.88: `accessibilityRole='adjustable'`, `accessibilityValue {min,max,now,text}`, `accessibilityActions` increment and decrement handled in `onAccessibilityAction`. The Android `setProgress` action (requested value in `event.nativeEvent.value`) is absent from 0.88 and ships in RN 0.89; add it only after upgrading.

## Reduced motion

Keyboard or track-tap jumps go straight to the new position. Dragging is unchanged: a thumb that follows the pointer adds no interpolated steps, so it is not motion animation under the WCAG 2.3.3 definition. The numeric value or output text carries the exact state.

## Keyboard

Right/Up increase one step; Left/Down decrease; Home sets the minimum and End the maximum; Page Up/Down make larger steps (optional, APG). Radix adds Shift+Arrow for a larger step. In RTL, horizontal arrows mirror.

## Performance

Run expensive work (filter queries, re-renders) on the commit event (`change`, `onValueCommit`, `onSlidingComplete`) or per rAF, not on every `input` event. Use `transform` for thumb and fill. In RN, keep drag math in UI-thread worklets, avoid setState per frame, and cross to JS only on commit.

## Primitives to reuse

- Web: native range input; Radix UI Slider (multi-thumb, `minStepsBetweenThumbs`, `onValueCommit`); React Aria Slider.
- Native: `@react-native-community/slider` (single value, Expo-bundled); `@callstack/slider` v6 for ranged two-thumb sliders; `@expo/ui` Slider (universal one inside `Host`).

## Tests

- Automated: `role=slider` with an accessible name; arrow, Home, End and Page keys change `aria-valuenow` by step; `aria-valuetext` includes units; a track click sets the value; the commit handler fires once per drag; range thumbs cannot cross.
- Visual QA: the value stays visible during drag and is not hidden by the finger; tick labels and units are present; the thumb is large enough on mobile; focus is visible on each thumb.

## State integrity

Show the live local value while dragging, but persist and show "saved" or filtered results only after commit and the server's response. Do not save every intermediate value. If the save fails, keep the slider at the user's value with an error and a retry, rather than snapping back silently.

## References

- [WAI-ARIA APG: Slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- [WAI-ARIA APG: Multi-thumb slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/)
- [WCAG 2.2 Understanding 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [WCAG 2.2 Understanding 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [NN/g: Slider design](https://www.nngroup.com/articles/gui-slider-controls/)
- [Apple HIG: Sliders](https://developer.apple.com/design/human-interface-guidelines/sliders)
- [MDN: input type=range](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range)
- [@react-native-community/slider 5.2.1 README](https://unpkg.com/@react-native-community/slider@5.2.1/README.md)
- [@callstack/slider README](https://raw.githubusercontent.com/callstack/react-native-slider/main/README.md)
- [Expo UI: universal components](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal.md)
- [Expo UI: universal Slider](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/slider.md)
- [React Native: Accessibility](https://raw.githubusercontent.com/facebook/react-native-website/main/docs/accessibility.md)
- [Gesture Handler: Reanimated interactions](https://raw.githubusercontent.com/software-mansion/react-native-gesture-handler/main/packages/docs-gesture-handler/docs/fundamentals/reanimated-interactions.mdx)

## Not verified

- "In RTL, horizontal arrows mirror" is not in the APG slider pattern; browser and library behaviour was not checked.
- Baseline status of vertical-form-controls: webstatus.dev still returned "newly" (low date 2024-04-18) on 2026-11-23, though 30 months had passed on 2026-10-18; the wording may soon change.
- Screen-reader behaviour of `@callstack/slider` v6 ranged thumbs, and its web support (the README lists iOS and Android only). v6.0.0 was published 2026-11-16.
- The stability level of `@expo/ui` universal components; the SDK 58 docs state no alpha, beta or stable label.
- The NN/g claims on this page were not opened by the first reader.
