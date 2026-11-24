---
number: 31
name: Card flips
classes: [decorative, comprehension]
tier: rarely-justified
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backface-visibility
  - https://lists.w3.org/Archives/Public/w3c-wai-ig/2020JulSep/0124.html
  - https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert
  - https://www.w3.org/WAI/ARIA/apg/patterns/button/
  - https://reactnative.dev/docs/accessibility
  - https://docs.swmansion.com/react-native-reanimated/examples/flipCard/
  - https://api.webstatus.dev/v1/features/light-dark
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (5 corrections applied).
---

# 31. Card flips

Leave card flips out of operational software and use a disclosure, tabs or a side-by-side
layout. Flip only when the front-and-back metaphor is the content itself, as in flashcards.

## Use when

Learning flashcards, or a two-sided physical artifact (an ID badge or a check, front and
back), where the metaphor aids understanding and the user explicitly asks to see the other
side.

## Avoid when

- Operational data hidden on a back face.
- Hover-triggered flips: they fail on touch and keyboard (W3C WAI-IG thread).
- Grids of cards users scan repeatedly, or any repeated action where a 400-600ms flip adds
  delay.
- No formal usability research was found; only practitioner reports of screen-reader and
  magnifier problems.

## Web technique

- Default: a button that swaps content, or two tabs ("Front" and "Back").
- When a flip is justified: `perspective` and `transform-style: preserve-3d` on the parent,
  `backface-visibility: hidden` on the faces, and a transition on `transform: rotateY(180deg)`
  only. Put `inert` on the hidden face.
- `backface-visibility` and `inert` are Baseline Widely available; Mar 2022 and Apr 2023 are
  the dates they became available across browsers.
- Never animate width, height, box-shadow or filter during the flip, and never trigger it on
  `:hover`.

## Native technique

- Reanimated: interpolate a shared value to `transform` `[{perspective}, {rotateY}]` on two
  absolutely positioned faces with `backfaceVisibility: 'hidden'`, driven by `withTiming`.
- The official example at docs.swmansion.com/react-native-reanimated/examples/flipCard/ uses
  a boolean shared value, `interpolate` to 0-180 and 180-360 degrees, `withTiming`, and
  `rotateY` (or `rotateX`) on two faces, which matches this approach.
- Hide the inactive face on both platforms: `importantForAccessibility="no-hide-descendants"`
  (Android) together with `accessibilityElementsHidden` (iOS), or the cross-platform
  `aria-hidden` prop. Also set `pointerEvents="none"` on the hidden face.
- No haptic.

## Timing

300-450ms ease-in-out for one flip; NN/g's 100-400ms range applies, and longer drags. No
spring overshoot: it reads as wobble. Swap content at the 90-degree midpoint.

## Accessibility

- Use either a label that changes with the face ("Show back of badge" / "Show front of
  badge") without `aria-pressed`, or a fixed label ("Back of badge") with `aria-pressed`
  true/false. Never combine a changing label with `aria-pressed`.
- Keep focus on the button. Repeat the front title on the back: a participant's suggestion in
  a 2020 W3C WAI-IG mailing-list thread, where another participant also advised Enter/Space
  activation instead of hover or focus and noted hover fails on touch. This is not formal W3C
  guidance.
- The hidden face is inert or `aria-hidden`. A polite live region is optional when the label
  already changes.
- WCAG 2.3.3, 2.1.1, 1.3.2.
- RN: `accessibilityRole="togglebutton"` with `accessibilityState={{checked}}` (or
  `aria-checked`), or `role="button"` with a changing `accessibilityLabel`.

## Reduced motion

Replace the rotation with a 100-150ms opacity crossfade or an instant swap. The changed
button label and a visible "Back" or "Front" heading carry what the rotation implied.

## Keyboard

Enter and Space on the toggle button flip the card. Tab order reaches only the visible face's
controls. No APG pattern exists for flips; the button pattern applies.

## Performance

Transform is compositor-only, but `preserve-3d` with large shadows or many cards flipping at
once forces extra layers and memory; never flip a whole grid. On mobile, flip one card at a
time on the UI thread (Reanimated worklet).

## Primitives to reuse

- Web: a native `<button>`, with Radix Tabs or Collapsible as the non-flip alternative.
- Native: Reanimated `useSharedValue` and `useAnimatedStyle`. No dedicated flip primitive was
  found.

## Tests

- The hidden face is not focusable and not in the accessibility tree.
- The label or `aria-pressed` updates.
- The flip is instant under reduced motion.
- Visual QA: no mirrored text, no z-fighting or flicker at 90 degrees, both faces the same
  size.

## State integrity

Not applicable: a flip is presentational. Never use a flip to signal that an action
succeeded.

## References

- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backface-visibility
- https://lists.w3.org/Archives/Public/w3c-wai-ig/2020JulSep/0124.html
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert

## Not verified

- Whether the Reanimated flip-card example sets `backfaceVisibility: 'hidden'`: the page
  opened, but its full code is collapsed and was not read.
