---
number: 39
name: Deletion animations
classes: [functional-feedback, comprehension]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
  - https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/
  - https://reactnative.dev/docs/layoutanimation
  - https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - https://www.nngroup.com/articles/animation-duration/
  - https://api.webstatus.dev/v1/features/transition-behavior
  - https://github.com/reactjs/react.dev/blob/main/src/content/reference/react/ViewTransition.md
  - https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.88/accessibilityinfo.md
  - https://github.com/software-mansion/react-native-reanimated/blob/main/docs/docs-reanimated/docs/guides/accessibility.mdx
  - https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.88/layoutanimation.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (5 corrections applied).
---

# 39. Deletion animations

Removing an item must show what went where: a brief fade and collapse for single items, instant removal for bulk, then focus to a sensible neighbour plus a status message with undo.

## Use when

A user deletes, archives or dismisses one item, or a few, from a visible list or table and needs to see that the right one went and the rest closed up.

## Avoid when

- Bulk deletes of many rows: remove instantly and summarize ("Deleted 40 orders").
- Virtualized lists with recycling.
- Deletions caused by other users or sync: mark the row "Removed by …" rather than make it vanish under the cursor.

## Web technique

1. Remove the element, move focus to the next row (or the previous one, or the list heading if the list is empty), and announce.
2. In React 19.3+, wrap every keyed row in `<ViewTransition>` and remove the item inside `startTransition`: the removed row exits and the remaining rows animate to their new positions. Do not call `document.startViewTransition` in React. Outside React, every row needs its own unique `view-transition-name` (MDN BCD: Baseline since 2025-10-14). Or use `element.animate()` (WAAPI, Baseline widely available) on `opacity` and `transform`, then remove on finish.
3. Use Motion `AnimatePresence` with `layout` on siblings if it is already in the stack. Collapsing height is a layout animation; if used, run it on a single row after the fade, never on many rows.
4. `@starting-style` covers entry; exit with `display`/`overlay` transitions uses `transition-behavior: allow-discrete`. Both have been Baseline newly available since 2024-08-06 per web-features. Feature-detect and fall back to instant removal.

## Native technique

- Reanimated `exiting={FadeOut.duration(150)}` on the row and `itemLayoutAnimation={LinearTransition}` on `Animated.FlatList` (single column).
- Or call `LayoutAnimation.configureNext({duration: 250, delete: {type: 'easeInEaseOut', property: 'opacity'}, update: {type: 'easeInEaseOut'}})` before `setState`.
- On FlashList, call `prepareForLayoutAnimationRender()` first.
- No haptic for button-initiated deletes; for a swipe commit see pattern 33.

## Timing

Fade 100–150 ms, then the gap closes in 150–200 ms: about 250–300 ms in total, or less. Exit is shorter than entry (NN/g), with ease-in or Material standard-accelerate `cubic-bezier(0.3,0,1,1)` for the leaving row and ease-out for siblings. No spring bounce.

## Accessibility

- After removal, move focus programmatically to the next logical item so focus is not lost on `document.body` (WCAG 2.4.3).
- Announce "Order 1042 deleted" through `role=status` with the undo control reachable (4.1.3); do not use `role=alert` for routine deletes.
- `Element.ariaNotify` is Baseline newly available since 2026-09-14 per MDN BCD, but a live region remains the safe default.
- React Native: announce with `AccessibilityInfo.announceForAccessibility` (or `announceForAccessibilityWithOptions(message, {queue: true})`; `queue` is iOS only) and move focus with `AccessibilityInfo.sendAccessibilityEvent(neighbourRef.current, 'focus')`. `setAccessibilityFocus` is deprecated.

## Reduced motion

Reanimated omits exiting animations and jumps layout transitions to their end under `ReduceMotion.System`. If `LayoutAnimation` is used instead, skip `configureNext` when `AccessibilityInfo.isReduceMotionEnabled()` resolves true. Either way the cue comes from focus on the neighbour, a status message naming the item and the undo snackbar. Optionally show a 1 s static highlight on the row that moved into the place.

## Keyboard

The Delete key on a focused row or option where the list supports it (the APG rearrangeable listbox uses Delete for remove actions), and Enter or Space on the delete button. After deletion, focus moves to a neighbour so arrow navigation continues.

## Performance

Opacity and transform are compositor-only. Height collapse triggers layout for everything below it: acceptable for one row, costly in long tables. Animate only rows in the viewport. With recycling lists, an exit animation on a recycled cell can glitch, so prefer the list-level layout APIs.

## Primitives to reuse

- Web: React `<ViewTransition>`; WAAPI `element.animate`; View Transition API; Motion `AnimatePresence`.
- Native: Reanimated `entering`/`exiting` and `LinearTransition`; React Native `LayoutAnimation`; FlashList `prepareForLayoutAnimationRender`.

## Tests

- Automated: after delete, the item is gone from the model and the DOM, `document.activeElement` is the expected neighbour, the status region text names the item (EN and ES), the undo control exists, and under emulated reduced motion removal happens within one frame.
- Visual QA: no flash of the deleted content after removal, no list jump while scrolled, and the collapse does not overlap the next row.

## State integrity

- Reversible delete (soft delete or deferred commit): the row may leave immediately with "Deleted · Undo". If the server rejects it, put the row back in its original position with an error naming the reason.
- Irreversible or permission-checked delete: keep the row in place, dimmed with `aria-busy='true'` and a "Deleting…" label, until the server confirms; only then animate it out.

## References

- https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/
- https://reactnative.dev/docs/layoutanimation
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- https://www.nngroup.com/articles/animation-duration/

## Not verified

- Motion `AnimatePresence` specifics (docs not opened).
- That React Native `LayoutAnimation` ignores the OS Reduce Motion setting is inferred from the docs saying nothing about it, not from an explicit statement or a device test.
- FlashList `prepareForLayoutAnimationRender` was confirmed in the guide on the main branch only; behaviour on the Android New Architecture was not tested.
