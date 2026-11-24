---
number: 54
name: Search filtering transitions
classes: [functional-feedback, perceived-performance, comprehension]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.nngroup.com/articles/applying-filters/
  - https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - https://reactnative.dev/docs/accessibilityinfo
  - https://web.dev/articles/animations-guide
  - https://github.com/reactjs/react.dev/blob/main/src/content/reference/react/useDeferredValue.md
  - https://github.com/reactjs/react.dev/blob/main/src/content/reference/react/ViewTransition.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (1 correction applied).
---

# 54. Search filtering transitions

Show at once that results are updating and when they are done: dim stale results, update a polite count, keep scroll and focus. Item-level animation is optional and never delays results.

## Use when

Any search-as-you-type or facet filter over a list or table. The core requirement is feedback (updating state, result count, empty state); motion is the optional part.

## Avoid when

- Per-item enter and exit animation for large or virtualized result sets.
- Filters applied many times per minute.
- Slow back ends: NN/g says interactive filtering suits only fast updates; otherwise batch with an Apply button.
- Never jump the scroll position to the top while the user is still in the filter area.

## Web technique

1. A `<search>` form with a labelled input. Drive results from `useDeferredValue(query)` and dim them while `query !== deferredQuery` (React's documented pattern), with `aria-busy='true'`.
2. Optionally crossfade the results container's opacity in 100–150 ms. For small sets, wrap items in React 19.3 `<ViewTransition>`, which deferred updates activate, instead of calling `document.startViewTransition`.
3. Never stagger results or animate `height` on result rows.

## Native technique

- `TextInput` with a debounced query and a FlashList or FlatList data swap, with no item animations for long lists.
- Show an `ActivityIndicator` or dim the list (opacity via Reanimated) while loading.
- Announce the count with `AccessibilityInfo.announceForAccessibility` after results settle, or `accessibilityLiveRegion='polite'` on a count `Text` (Android only).
- No haptics per keystroke.

## Timing

Results update in under 1 s for interactive filtering (NN/g). Debounce input about 150–300 ms (a heuristic). Fade 100–150 ms; no waiting animation if results are ready.

## Accessibility

- Result counts, "Searching…" and "No results" are status messages: `role=status` (polite), debounced so each keystroke is not announced (WCAG 4.1.3; its Understanding document gives "18 results returned" and "No results returned" as examples).
- Focus stays in the input or filter control; the results list itself is not a status message.
- Localize plurals ("1 resultado" / "18 resultados").
- WCAG 4.1.3, 2.4.3, 3.2.2 (no context change on input), 1.3.1 for filter labels.
- React Native: a debounced `announceForAccessibility`, and on iOS the `announceForAccessibilityWithOptions` `queue` option so speech is not cut off.

## Reduced motion

Results swap instantly with no crossfade or slides. The updating state is carried by the static dimmed or `aria-busy` state plus an inline spinner or text; the done state by the updated count in the status region.

## Keyboard

Typing filters without moving focus; Escape clearing the field is a common convention. Tab reaches the results. If suggestions are offered, follow the APG combobox (Down Arrow into the listbox, Enter selects, Escape closes).

## Performance

Do not re-render or animate thousands of rows per keystroke: debounce, virtualize, and filter off the main render path. Opacity on the container is compositor-only; per-item layout animations on a virtualized list cause jank and break recycling. Cancel in-flight requests so stale responses cannot overwrite newer results.

## Primitives to reuse

- Web: the `<search>` element, `<input type=search>`, a `role=status` region, React `useDeferredValue` and `<ViewTransition>`, React Aria `SearchField` and `ComboBox`.
- Native: `TextInput`, FlashList, `ActivityIndicator`, `AccessibilityInfo`.

## Tests

- Automated: after typing, the status region eventually holds the correct count in EN and ES and does not update on every keystroke; focus remains in the input; out-of-order responses never show stale results (mock delayed responses); "No results" appears only after the request resolves; with reduced motion emulated, no transitions run.
- Visual QA: no flicker or empty flash between queries, scroll position is preserved, and the dimmed state is perceptible but readable.

## State integrity

While a query is in flight, the previous results may stay visible only if they are clearly marked stale (dimmed, `aria-busy`). Never show "0 results" or an empty state before the request for the current query resolves, and never show results from an older query once a newer one has been issued: drop out-of-order responses.

## References

- https://www.nngroup.com/articles/applying-filters/
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- https://reactnative.dev/docs/accessibilityinfo
- https://web.dev/articles/animations-guide

## Not verified

- The NN/g guidance that interactive filtering should update in under 1 s.
- The 150–300 ms debounce heuristic has no confirmed source; the web.dev animations guide was not opened.
- React Aria `SearchField` and `ComboBox`.
- Escape clearing a plain filter field is a convention, not confirmed as an APG requirement.
