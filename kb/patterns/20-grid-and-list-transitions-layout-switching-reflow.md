---
number: 20
name: Grid and list transitions (layout switching, reflow)
classes: [comprehension, navigation, decorative]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
  - https://motion.dev/docs/react-layout-animations
  - https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/list-layout-animations/
  - https://reactnative.dev/docs/layoutanimation
  - https://www.nngroup.com/articles/animation-duration/
  - https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/
  - https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StandardMotionTokens.kt
  - https://github.com/reactjs/react.dev/blob/main/src/content/reference/react/ViewTransition.md
  - https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/view-transitions.mdx
  - https://unpkg.com/react@19.3.1/cjs/react.production.js
  - https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.88/accessibility.md
  - https://github.com/software-mansion/react-native-reanimated/blob/main/docs/docs-reanimated/docs/guides/accessibility.mdx
  - https://motion.dev/docs/react-accessibility
  - https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.88/layoutanimation.md
  - https://github.com/Shopify/flash-list/blob/main/documentation/docs/guides/layout-animation.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (5 corrections applied).
---

# 20. Grid and list transitions (layout switching, reflow)

Animate reflow only so people can follow where items went after a sort, view switch or insert. Keep it short and transform-only, and skip it for large sets.

## Use when

A small, visible set (roughly under 50 items; a heuristic) changes order or arrangement because the user asked for it: sort, list/grid toggle, or pinning an item. Use it where losing track of the focused or selected item is the real risk.

## Avoid when

- Large or virtualized tables.
- Live data that reorders on its own.
- Sorts that staff repeat many times an hour: the motion makes them wait on every repeat.
- Items that are off-screen before and after the change.

## Web technique

1. Keep the DOM order equal to the visual order and keep focus on the same item.
2. In React 19.3+ and Next.js 16, wrap each keyed item in `<ViewTransition>` and run the sort or toggle inside `startTransition`; a plain `setState` does not animate. Never call `document.startViewTransition` in a React tree: React calls it itself and interrupts other transitions. Next.js needs no flag.
3. Outside React, use same-document View Transitions: `document.startViewTransition`, a per-item `view-transition-name`, and `view-transition-class` to style the group. MDN BCD shows this as Baseline newly available since 2025-10-14 (Chrome 111, Firefox 144, Safari 18); feature-detect it and update instantly where it is missing.
4. Motion's `layout` prop (package `motion`, v14.14.0 on npm) stays the fallback, for changes View Transitions cannot express.

Animate only `transform` and `opacity`; never animate `width`, `height`, `top`, `left` or `grid-template` directly.

## Native technique

- Single-column lists: `Animated.FlatList` with `itemLayoutAnimation={LinearTransition}` (Reanimated 4.x; the docs say it works only with a single column).
- Or call `LayoutAnimation.configureNext(Presets.easeInEaseOut)` before the state update; no Android flag is needed on the New Architecture.
- A list/grid switch that changes `numColumns`: swap without animation, or use a short `FadeIn` on the new layout.
- FlashList v2: call `prepareForLayoutAnimationRender()` before `LayoutAnimation` and set a `keyExtractor`.
- No haptics.

## Timing

200–300 ms (NN/g gives 200–300 ms for larger changes and says to keep frequent animations shorter), ease-out or emphasized-decelerate `cubic-bezier(0.05,0.7,0.1,1)`. For a no-bounce spring, use damping ratio 1; in Reanimated, use duration-based `withSpring({duration, dampingRatio:1})`. Material default spatial is dampingRatio 0.9 with stiffness 700 (mass 1), which overshoots very slightly. Never pass 0.9 as Reanimated `damping`, which is a coefficient (default 120, mass 4).

## Accessibility

- View switch: a group of toggle buttons with `aria-pressed` (or a radio group); keep focus on it.
- After a sort, set `aria-sort` on the sorted header (APG grid) and keep focus on the same row or item.
- Announce only what is not otherwise exposed, for example a `role=status` message "Sorted by due date, ascending".
- WCAG 2.3.3 (AAA) for motion, 1.3.2 meaningful sequence, 2.4.3 focus order.
- React Native: give each view toggle `accessibilityRole='togglebutton'` with `accessibilityState={{checked}}` (or `'radio'` items with `checked` inside a `'radiogroup'` for a list/grid choice), and announce the sort result with `AccessibilityInfo.announceForAccessibility`.

## Reduced motion

Reanimated layout animations jump to their end state under `ReduceMotion.System`. Other routes need explicit gating:

- Skip `LayoutAnimation.configureNext` when `AccessibilityInfo.isReduceMotionEnabled()` resolves true.
- Wrap Motion in `<MotionConfig reducedMotion='user'>`.
- Switch off `::view-transition` animations inside `@media (prefers-reduced-motion: reduce)`.

Then show a 1–2 s static highlight (background tint, not movement) on the moved or focused item and keep focus on it. If a crossfade is acceptable, use opacity only (iOS `prefersCrossFadeTransitions`).

## Keyboard

View toggle: Tab to the group, Enter or Space to activate (radio group: arrow keys). Sortable headers: Enter or Space. In a grid widget, the APG grid keys (arrows, Home/End, Ctrl+Home/End, PageUp/PageDown) must still reach the same logical cell after reflow.

## Performance

View Transitions and Motion animate snapshots or transforms on the compositor, but View Transitions capture each named element, so name only viewport items. Avoid layout animations on long recycling lists. FlashList supports `LayoutAnimation` only through `prepareForLayoutAnimationRender()` plus `keyExtractor`, and its docs call `LayoutAnimation` experimental on Android with no stability guarantee: use it for short lists, test on Android, and fall back to an instant update. On native, keep animations on the UI thread with Reanimated and disable `itemLayoutAnimation` for long lists.

## Primitives to reuse

- Web: React `<ViewTransition>`; the browser View Transition API; Motion `layout` / `LayoutGroup`.
- Native: Reanimated `LinearTransition` and `Animated.FlatList` `itemLayoutAnimation`; React Native `LayoutAnimation`; FlashList `prepareForLayoutAnimationRender`.

## Tests

- Automated: after sort or toggle, the DOM order matches the visual order, `document.activeElement` is the same item, `aria-sort` or `aria-pressed` is updated, and with emulated `prefers-reduced-motion` no `::view-transition` pseudo-elements run longer than 0 ms.
- Visual QA: no overlapping or stretched text mid-transition (Motion scale distortion), no jank on a mid-range phone, and the focused item stays visible.

## State integrity

Not applicable: the change is local and caused by the user.

## References

- https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- https://motion.dev/docs/react-layout-animations
- https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/list-layout-animations/
- https://reactnative.dev/docs/layoutanimation
- https://www.nngroup.com/articles/animation-duration/

## Not verified

- Motion `layout` scale-distortion behaviour (docs not opened).
- The default value of Motion `MotionConfig` `reducedMotion` (only the `'user'` option was confirmed).
- That React Native `LayoutAnimation` ignores the OS Reduce Motion setting is inferred from the docs saying nothing about it, not from an explicit statement or a device test.
- FlashList `prepareForLayoutAnimationRender` was confirmed in the guide on the main branch only; behaviour on the Android New Architecture was not tested.
