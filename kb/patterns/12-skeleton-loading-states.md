---
number: 12
name: Skeleton loading states
classes: [perceived-performance, comprehension]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.nngroup.com/articles/skeleton-screens/
  - https://adrianroselli.com/2020/11/more-accessible-skeletons.html
  - https://web.dev/articles/cls
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy
  - https://mui.com/material-ui/react-skeleton/
  - https://nextjs.org/docs/app/api-reference/file-conventions/loading
  - https://reactnative.dev/docs/accessibility
  - https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/packages/react-native-reanimated/src/animation/repeat.ts
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (4 corrections applied).
---

# 12. Skeleton loading states

Use static, layout-accurate skeletons for first loads of full pages or lists lasting about 1 to 10 seconds. Never use them for quick loads, refetches of visible data, or file and process progress.

## Use when

- First load of a page, list, or dashboard whose layout is known and which typically takes about 1 to 10 s. NN/g: full-page loads under 10 s; previewing the layout lowers cognitive load.
- Lists on slow mobile networks.

## Avoid when

- Loads under about 1 s (NN/g: flashing placeholders hurt).
- Refetching data already on screen: keep the stale data with a small inline refresh indicator. Re-skeletoning on every repeated navigation slows all-day work.
- Uploads, downloads, and conversions: use bars (NN/g finds skeletons confusing there).
- Frame-only skeletons.
- Over 10 s: use explicit progress.
- The linked 2020 accessibility article treats skeletons as something close to an anti-pattern, which conflicts with NN/g's support, so use them sparingly.

## Web technique

1. A React Suspense fallback. In Next.js 16 the `loading.js` file convention wraps `page.js` in a Suspense boundary, and the fallback is prefetched. Render static grey blocks at the exact final dimensions (CLS at or below 0.1, per web.dev).
2. An optional shimmer only inside `@media (prefers-reduced-motion: no-preference)`, animating `transform: translateX` of a gradient pseudo-element, or `opacity`. Never animate `background-position`, `width`, or `height` (paint or layout). The skeleton starts automatically, so stop the animation after about 5 s (WCAG 2.2.2). No library needed.

## Native technique

- Static Views matching the final row and card geometry, rendered as real list items in `FlatList` with the same heights (keeps `getItemLayout` valid).
- Optional opacity pulse: `withRepeat(withTiming(...), -1, true)`. Under reduce motion a reversed infinite repeat does not start and stays at its start value; a non-reversed one jumps to `toValue`.
- Moti `Skeleton` exists (0.30.0, last published January 2025; repository last pushed March 2025), so maintenance is uncertain.
- No haptics.

## Timing

- Show it after about 300 to 500 ms (avoids a flash; heuristic).
- Pulse cycle about 1.5 to 2 s ease-in-out, or a shimmer sweep of about 1.5 s.
- Content replaces the skeleton with a 100 to 200 ms opacity crossfade at most, and no staggered reveal.

## Accessibility

- The skeleton is `aria-hidden=true` and never focusable.
- The region gets `aria-busy=true`, then `false`, plus a visually hidden "Loading orders…" in `role=status` (polite). Do not rely on `aria-busy` alone: the linked 2020 testing found only JAWS honoured it, and live-region timing was unreliable.
- Skeleton shapes need about 3:1 contrast if they convey state (the linked article's reading of 1.4.11), and support forced-colors with system colours.
- WCAG 4.1.3, 1.4.11, 2.2.2 (the skeleton animation starts automatically).
- RN: `accessibilityElementsHidden` (iOS) plus `importantForAccessibility='no-hide-descendants'` (Android) on the placeholders, `accessibilityState={{busy:true}}` on the container, and `announceForAccessibility('Loaded')` if needed.

## Reduced motion

- Static blocks with no shimmer or pulse. The static layout carries "content is coming here", plus a visible or visually hidden "Loading…" text.
- After about 10 s, swap in an explanatory message with Retry, since there is no motion to imply life.

## Keyboard

Not applicable: placeholders are not interactive and must not be in the tab order. When loading finishes, focus lands on the first real content or stays where the user was.

## Performance

- Exact sizing prevents CLS.
- A `transform` or `opacity` shimmer is compositor-only; a `background-position` shimmer repaints every frame across the whole list.
- Use one shared animation (a single gradient overlay) rather than per-block animations on long lists. On mobile, cap the skeleton rows to one screen.

## Primitives to reuse

- Web: MUI `Skeleton` (variants `text`, `circular`, `rectangular`, `rounded`; `animation` `pulse`, `wave`, or `false`; no documented reduced-motion handling, so add it yourself); shadcn/ui `Skeleton` (not checked).
- Native: plain Views plus Reanimated; Moti `Skeleton` (maintenance caveat).

## Tests

- The skeleton container is `aria-hidden`, and the region has `aria-busy` true, then false.
- The skeleton is not rendered when data resolves within the threshold (fake timers).
- Under reduced motion there are no running animations.
- Bounding boxes of skeleton rows match the loaded rows (snapshot or layout assertions).
- Lighthouse or web-vitals CLS is at or below 0.1.
- Visual QA: shapes match the real layout, no jump on swap, contrast, forced-colors rendering.

## State integrity

Not applicable: it signals a load state, not the result of an action. Skeletons must never contain plausible fake values (numbers, names, statuses) that could be mistaken for real data.

## References

- [NN/g: skeleton screens](https://www.nngroup.com/articles/skeleton-screens/)
- [More accessible skeletons (2020)](https://adrianroselli.com/2020/11/more-accessible-skeletons.html)
- [web.dev: CLS](https://web.dev/articles/cls)
- [MDN: aria-busy](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy)
- [MUI Skeleton](https://mui.com/material-ui/react-skeleton/)
- [Next.js: loading.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading)
- [React Native: accessibility](https://reactnative.dev/docs/accessibility)
- [Reanimated source: repeat.ts](https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/packages/react-native-reanimated/src/animation/repeat.ts)
- [WCAG 2.2 Understanding 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

## Not verified

- shadcn/ui `Skeleton` was not opened; Moti compatibility with Reanimated 4.8 and the RN 0.88 New Architecture was not checked.
- The show delay, pulse and shimmer cycles have no primary source; only the NN/g figures were confirmed.
