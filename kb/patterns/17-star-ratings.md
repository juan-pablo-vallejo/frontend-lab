---
number: 17
name: Star ratings
classes: [functional-feedback, emotional-engagement]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/radio/examples/radio-rating/
  - https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
  - https://measuringu.com/rating-scale-best-practices-8-topics-examined/
  - https://www.nngroup.com/articles/gui-slider-controls/
  - https://www.w3.org/WAI/content-assets/wai-aria-practices/patterns/radio/examples/js/radio-rating.js
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (1 correction applied).
---

# 17. Star ratings

Build a rating input as a radio group of labelled stars, with no bounce or sparkle. In operational software, prefer a labelled numeric or word scale unless stars are what users expect.

## Use when

- Customer or job-quality feedback where users know the 5-star idiom and the value is approximate.
- Read-only display of averages, with the number shown next to the stars.

## Avoid when

- Operational assessments that need defined meanings (condition 1–5 with criteria): labelled radios or a segmented control are clearer and translate better to Spanish.
- Precise numbers, half-star input on touch, and celebratory animations on every tap in repeated inspections.
- MeasuringU found stars not significantly different from numeric scales, so they add no measuring power over a number.

## Web technique

1. A radio group: native radios styled as stars (`fieldset`/`legend`; each input labelled "1 star" to "5 stars"), or the APG rating pattern (`role=radiogroup`, `role=radio` items, inline SVG with `role=none`, `currentColor`).
2. Change the fill through CSS `fill` or `color`, optionally with `transform: scale()` under 150 ms. A hover preview via `:has(:hover)` is optional. Never animate layout properties.
3. Read-only display: text such as "4.2 out of 5" plus decorative SVG with `aria-hidden`.

## Native technique

- A `Pressable` per star inside a container with `accessibilityRole='radiogroup'`; each star has `accessibilityRole='radio'`, `accessibilityLabel` "3 stars" and `accessibilityState {checked}`.
- Or a single element with `accessibilityRole='adjustable'`, `accessibilityValue {min:1,max:5,now,text}` and increment/decrement `accessibilityActions`.
- `Haptics.selectionAsync` on change is optional; no success haptic until saved.

## Timing

Fill in 0–100 ms. No staggered or sequential star fills, and no bounces, in operational contexts.

## Accessibility

- Follow the APG Rating Radio Group example: a radiogroup labelled by a visible label, radio names such as "one star", roving tabindex, a focus ring with 2 px offset, and forced-colors support through `currentColor`.
- Filled and empty stars differ by shape or fill at 3:1, not by hue alone; pale yellow on white fails 1.4.11 and 1.4.1.
- Targets at least 24 px (2.5.8).
- If the rating is optional, provide a way to clear it or choose "no rating"; APG has no zero option.
- RN: radiogroup/radio roles, or adjustable plus `accessibilityValue.text`.

## Reduced motion

No scale or sparkle. Stars switch fill instantly, and the selected count also shows as text ("3 of 5"), so the value never depends on the animation.

## Keyboard

Same as a radio group (APG rating example): Tab reaches the checked star; Right/Down select the next star and Left/Up the previous, wrapping; Space checks the focused star.

## Performance

SVG fill changes repaint small areas. In lists of read-only ratings, render static SVG or icon fonts, with no per-item animation.

## Primitives to reuse

- Web: native radio inputs; the APG Rating Radio Group example; React Aria RadioGroup with custom rendering. The APG Rating Slider example is the slider alternative.
- Native: a custom `Pressable` group; there is no core rating control.

## Tests

- Automated: a radiogroup with 5 radios named "1 star" to "5 stars"; arrow keys change the checked star; the value submits; clearing works when the rating is optional.
- Visual QA: empty against filled contrast in light, dark and forced colors; focus ring spacing; tap targets; the label or number visible next to the stars.

## State integrity

- If the rating saves on selection, arrow keys check every star they pass: debounce, abort superseded saves and apply only the latest response.
- Selected stars may show at once with a pending cue; "Thanks, rating saved" waits for the server.
- On failure, keep the selection, show an error and offer retry.

## References

- [WAI-ARIA APG: Rating Radio Group example](https://www.w3.org/WAI/ARIA/apg/patterns/radio/examples/radio-rating/)
- [APG rating example script](https://www.w3.org/WAI/content-assets/wai-aria-practices/patterns/radio/examples/js/radio-rating.js)
- [WCAG 2.2 Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [MeasuringU: Rating scale best practices](https://measuringu.com/rating-scale-best-practices-8-topics-examined/)
- [NN/g: Slider design](https://www.nngroup.com/articles/gui-slider-controls/)

## Not verified

- Whether the APG Rating Radio Group lacks a zero or no-rating option; the page read did not say.
