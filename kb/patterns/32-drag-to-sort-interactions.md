---
number: 32
name: Drag-to-sort interactions
classes: [functional-feedback, comprehension, error-prevention]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
  - https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/
  - https://react-aria.adobe.com/dnd
  - https://dndkit.com/guides/accessibility
  - https://github.com/omahili/react-native-reorderable-list
  - https://github.com/software-mansion/react-native-reanimated/blob/main/docs/docs-reanimated/docs/animations/withSpring.mdx
  - https://unpkg.com/@dnd-kit/sortable@10.0.0/dist/sortable.esm.js
  - https://docs.dndkit.com/legacy/presets/sortable/use-sortable.md
  - https://docs.dndkit.com/guides/accessibility.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 32. Drag-to-sort interactions

Manual ordering must work without dragging: offer move up/down or "Move to…" controls and keyboard moves, and give drag lift, gap and drop feedback.

## Use when

The user owns an arbitrary order, such as the job sequence for a route, a priority queue or column order. Drag is the fast path for short lists that are visible at once.

## Avoid when

- The order can be derived: sort by date or priority instead.
- Long lists that need autoscroll: use "Move to position…".
- Moves between many targets, where a menu is faster.
- Reordering repeated all day: a "Move to top" action is faster than drag.

## Web technique

1. Keep the semantic list or table and add explicit Move up / Move down buttons, Alt+Up and Alt+Down shortcuts (APG rearrangeable listbox), and a "Move to…" menu (WCAG 2.5.7).
2. React Aria Components `GridList`, `ListBox` or `Table` with `useDragAndDrop` and `onReorder` (`react-aria-components` 1.22.1) provide keyboard and screen-reader drag. Or use `@dnd-kit` (legacy `@dnd-kit/sortable` 10.0.0 is stable but last published 2024-12; `@dnd-kit/react` is 0.5.3, pre-1.0).
3. Move siblings with `transform` only. `@dnd-kit/sortable` 10.0.0 ships a default transition of 200 ms ease (its docs still say 250 ms); set it explicitly, for example `transition: {duration: 200, easing: 'ease'}`. Lift the dragged item with a shadow on a pseudo-element via opacity, and show a drop indicator line. Never animate `top`, `left`, `margin` or `height` during the drag.

## Native technique

- `react-native-reorderable-list` (0.18.3; Reanimated and Gesture Handler, FlatList-based): long-press drag handle via `useReorderableDrag`, autoscroll, `onReorder`.
- `accessibilityActions` on each row (custom "move up", "move down", "move to top" with localized labels) and visible move buttons in an edit mode (Apple lists support reordering).
- Haptics: at lift, `Haptics.performAndroidHapticsAsync(Drag_Start)` on Android or `impactAsync(Light)` on iOS; `selectionAsync` on each slot change (`onIndexChange`); `impactAsync(Light)` or Android `Gesture_End` on drop.

## Timing

- Lift: about 100–150 ms.
- Siblings settle in 150–250 ms (reorderable-list defaults to 200 ms; dnd-kit 200 ms ease).
- Drop settle: `withSpring(target, {dampingRatio: 1, duration: 150})`. Reanimated's `duration` is perceptual and the real animation lasts 1.5 times as long (about 225 ms). Material fast spatial is dampingRatio 0.9 with stiffness 1400, a ratio and not Reanimated's `damping` (default 120, mass 4).
- The dragged item follows the finger 1:1 with no easing.

## Accessibility

- dnd-kit gives the activator `role=button`, `aria-describedby` instructions and an `aria-roledescription` (`'sortable'` from `useSortable`, `'draggable'` from `useDraggable`; localize it). It announces pick-up, over, drop and cancel through a live region whose English-only defaults must be translated. Use position wording ("position 2 of 5").
- React Aria announces drag and drop states and supports touch screen readers (double-tap to start, swipe between targets, double-tap to drop).
- After a move, keep focus on the moved item (APG) and confirm with a polite status.
- WCAG 2.5.7 (AA), 2.1.1, 4.1.3, 2.4.7.
- React Native: `accessibilityActions` / `onAccessibilityAction`, and announce the new position with `AccessibilityInfo.announceForAccessibility`.

## Reduced motion

Siblings jump to their final slots instead of sliding. The dragged item still follows the pointer because the user moves it directly. The drop indicator line and a static highlight on the moved item after the drop show the change. Haptics are separate from Reduce Motion and stay optional.

## Keyboard

- APG rearrangeable listbox: Up and Down move focus, Alt+Up and Alt+Down move the focused option, and focus stays on the moved option.
- dnd-kit: Enter or Space picks up, arrows move, Enter or Space drops, Escape cancels.
- React Aria: Enter starts, Tab or arrows move between drop positions, Enter drops, Escape cancels.

## Performance

Transforms are compositor-only. Collision detection runs on every pointer move, so do not trigger React re-renders per frame (use a `DragOverlay` for scrollable lists, per dnd-kit). Virtualized lists need a strategy that supports virtualization (dnd-kit `verticalListSortingStrategy`). On native, gesture and position stay on the UI thread (Reanimated worklets); reorderable-list blocks a new drag until the previous drop animation ends.

## Primitives to reuse

- Web: React Aria Components (`useDragAndDrop` with `GridList`, `ListBox`, `Table`, `Tree`); `@dnd-kit/sortable`; the APG rearrangeable listbox example for the keyboard model.
- Native: `react-native-reorderable-list`; `react-native-draggable-flatlist` 4.0.3 (last published 2025-05); Reanimated and Gesture Handler for a custom build.

## Tests

- Automated: keyboard reorder (Alt+Down, or Space, arrows, Space) changes the model order and keeps focus on the item; move buttons work with a single click (2.5.7); the live region text includes the new position in EN and ES; Escape restores the original order; on React Native, an accessibility action fired with `fireEvent` changes the order.
- Visual QA: the drop indicator is unambiguous, siblings do not flicker, autoscroll near the edges is controllable, and the dragged item keeps its size.

## State integrity

The new local order may show at drop because the user caused it, but persistence is pending: a subtle "Saving order…" state, sent once per drop, not per hover. If the save fails or the server returns a conflicting order (another user reordered), restore the server order, name the item, and offer retry. Never show "Saved" before the response.

## References

- https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/
- https://react-aria.adobe.com/dnd
- https://dndkit.com/guides/accessibility
- https://github.com/omahili/react-native-reorderable-list

## Not verified

- `react-native-reorderable-list` 0.18.3: the 200 ms default, `useReorderableDrag`, `onIndexChange` and blocking a drag until the drop ends; its peer range is Reanimated 3.12 or later and Gesture Handler 2.12 or later, and behaviour on Gesture Handler 3.5 with React Native 0.88 and under Reduce Motion was not confirmed.
- dnd-kit `verticalListSortingStrategy` support for virtualization.
- React Aria arrow keys between drop positions (its docs mention Tab only).
- `react-native-draggable-flatlist` 4.0.3 maintenance and compatibility with Reanimated 4.8, Gesture Handler 3.5 and React Native 0.88.
- `@dnd-kit/react` 0.5.3 keyboard and announcement model: the dnd-kit claims were checked against the legacy `@dnd-kit/core` and sortable docs and source only.
- The title and level of WCAG 4.1.2 were not extracted from the specification.
