---
number: 36
name: Carousels
classes: [navigation, comprehension, decorative]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
  - https://www.nngroup.com/articles/designing-effective-carousels/
  - https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
  - https://www.embla-carousel.com/docs/plugins/accessibility
  - https://unpkg.com/expo@58.0.26/bundledNativeModules.json
  - https://reactnative.dev/docs/accessibility
  - https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
  - https://api.webstatus.dev/v1/features/light-dark
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (4 corrections applied).
---

# 36. Carousels

Use a carousel only to browse a small homogeneous set such as attached photos. Never
auto-rotate in operational software, always pair swiping with visible previous and next
buttons, and show a position count.

## Use when

Swiping through a job's attached photos or document pages on a phone, or a few peer items
(five or fewer, per NN/g) where only one fits on screen. Let the next item peek at the edge to
signal more.

## Avoid when

- Lists of records, KPIs or actions users compare or scan: a list or grid is faster.
- Homepage-style promo rotators and auto-advance (especially on mobile, per NN/g).
- Dot-only navigation, often missed on mobile.
- More than about five frames.

## Web technique

- A native horizontal scroll container with `scroll-snap-type: x mandatory` and
  `scroll-behavior: smooth` gated by reduced motion. `scroll-snap-type` is Baseline Widely
  available; Apr 2022 is when it became available across browsers.
- Real `<button>` previous and next controls that call `scrollBy`/`scrollIntoView`, plus an
  "n of m" label.
- `::scroll-button` and `::scroll-marker` are limited availability and experimental: use them
  only as enhancement.
- A library only if needed: Embla Carousel 8.6.0 is stable; its accessibility plugin is a v9
  RC.
- Animate only transform or scroll position; never left or width of slides.

## Native technique

`FlatList` horizontal with `pagingEnabled` (or `snapToInterval`) and `getItemLayout`, or
`react-native-pager-view` at the version `npx expo install` selects (9.0.7 on Expo SDK 58;
npm latest 10.0.3 is not the SDK-pinned version). Visible previous and next `Pressable`s plus
a "3 of 8" text. No haptic on page change.

## Timing

A programmatic slide takes 200-300ms ease-out. A swipe follows the finger 1:1, then settles
with a critically damped spring or native deceleration. Auto-rotation is off by default; if a
product insists, allow at least the reading time (NN/g: about 3 words per second) and provide
a pause control.

## Accessibility

- APG: the container has `role=region` (or `group`) with `aria-roledescription="carousel"`
  and a label without the word carousel. Slides use `role=group` with
  `aria-roledescription="slide"` and labels like "3 of 8".
- The slide wrapper uses `aria-live=polite` when not rotating and `off` while rotating.
  Previous and next buttons don't move focus.
- WCAG 2.2.2 (pause for auto-advance), 2.5.1 (single-pointer alternative to flick), 2.5.7
  (buttons alongside drag), 2.1.1, 2.3.3.
- WCAG 2.5.8 Target Size (Minimum): previous, next and dot controls at least 24 by 24 CSS px,
  or spaced so 24px circles do not intersect.
- RN: a single focusable wrapper with `accessibilityRole="adjustable"`, increment and
  decrement `accessibilityActions` (VoiceOver swipe up/down) handled in
  `onAccessibilityAction`, and `accessibilityValue={{text: "Photo 3 of 8"}}`. Use it only
  when slides contain no interactive children. Keep the labelled buttons.

## Reduced motion

Page changes jump instantly with no smooth scroll (`scroll-behavior: auto`, Embla `duration`
0). The live-region "Slide 3 of 8" text and the updated counter carry what the slide motion
conveyed. Auto-rotation never starts.

## Keyboard

Tab and Shift+Tab move through the controls; Enter and Space activate previous, next and
rotation buttons without moving focus. A rotation control, when present, comes first in tab
order, and rotation stops on any focus or hover. The tabbed slide-picker variant uses
Left/Right arrows per the APG Tabs pattern.

## Performance

Native scroll snap is compositor-driven and cheapest. Lazy-load off-screen images
(`loading=lazy`; `expo-image` on native) and virtualize long sets (`FlatList` `windowSize`).
JS-driven drag on the web uses transform, not left, and passive listeners. Auto-rotation
drains battery and repaints even off-screen.

## Primitives to reuse

- Web: CSS scroll snap; Embla Carousel 8.6.0 (`useEmblaCarousel`). Its accessibility plugin
  exists only as a v9 RC; override its default "Carousel" label with a content name such as
  "Job photos".
- Native: `FlatList` `pagingEnabled`; `react-native-pager-view` at the Expo-pinned version
  (9.0.7 on SDK 58).

## Tests

- Visible buttons advance one slide and the count text updates.
- The live region announces when not rotating.
- No auto-advance unless enabled with a working pause.
- Controls on off-screen slides are not focusable.
- Visual QA: snap alignment is exact, the next item visibly peeks, no layout shift as images
  load, and RTL ordering is correct.

## State integrity

Not applicable for browsing. When slides are uploaded photos, an unconfirmed upload carries a
pending badge until the server acknowledges it.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
- https://www.nngroup.com/articles/designing-effective-carousels/
- https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- https://www.embla-carousel.com/docs/plugins/accessibility

## Not verified

- Compatibility of `react-native-pager-view` 10.0.3 with React Native 0.88 / Expo SDK 58: only
  the SDK-pinned version (9.0.7) was confirmed.
