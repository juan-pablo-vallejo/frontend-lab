---
number: 48
name: Expandable data tables (row expansion, detail panels)
classes: [comprehension, navigation]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
  - https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
  - https://tanstack.com/table/v8/docs/guide/expanding
  - https://www.nngroup.com/articles/data-tables/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size
  - https://api.webstatus.dev/v1/features/content-visibility
  - https://github.com/TanStack/table/blob/main/docs/framework/react/guide/expanding.md
  - https://react-aria.adobe.com/Table.md
  - https://github.com/software-mansion/react-native-reanimated/blob/main/docs/docs-reanimated/docs/guides/accessibility.mdx
  - https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.88/layoutanimation.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 48. Expandable data tables (row expansion, detail panels)

Use a real button with `aria-expanded` to reveal row details without losing table context. Open instantly or with a brief fade, never a slow height animation, and prefer a side panel for deep detail.

## Use when

Staff need a few extra fields or sub-rows (line items, history) while scanning many records, and the row's context must stay visible.

## Avoid when

- Deep editing or long detail: NN/g found users leave accordions open and clutter the table, so use a non-modal side panel that keeps the table visible.
- Detail that must be compared across non-adjacent rows.
- Modal popups that cover adjacent records.

## Web technique

1. A native `<table>`. Put a `<button aria-expanded aria-controls>` with a visible chevron in the first cell, and render detail in the next `<tr><td colspan=N>` (the TanStack Table detail-row pattern). Use APG treegrid only for hierarchical sub-rows that need cell navigation.
2. Open instantly, or with a 100–150 ms `opacity` and `translateY(-4px)` fade on the detail content; rotate the chevron with `transform`.
3. Do not animate row height in dense tables: it re-lays out the whole table. Chromium-only `interpolate-size` and `calc-size` are not Baseline per MDN. `::details-content` is Baseline newly available since 2025-09-16, but `<details>` cannot wrap a `<tr>`, so it suits only card or list layouts.

## Native technique

- A `Pressable` header with `accessibilityRole='button'` and `accessibilityState={{expanded}}`; render the detail conditionally.
- Animate with Reanimated `entering={FadeIn.duration(150)}` on the detail and `LinearTransition` on the following rows (`Animated.FlatList` `itemLayoutAnimation`), or with `LayoutAnimation.configureNext(Presets.easeInEaseOut)`.
- In FlashList, expanded rows change item size: call `prepareForLayoutAnimationRender()`.
- No haptics.

## Timing

Fade 100–150 ms with ease-out (NN/g: about 100 ms for simple, frequent feedback). The chevron rotates in 100–150 ms. Collapse is faster than expand. No springs.

## Accessibility

- Disclosure: a button with `aria-expanded` true/false and optional `aria-controls`; Enter or Space toggles.
- Treegrid: `aria-expanded` on the parent row; Right Arrow expands, Left Arrow collapses.
- Focus stays on the toggle; do not move it into the detail automatically.
- The button's name includes the row identity ("Show details for order 1042").
- WCAG 4.1.2 covers the expanded state (no live announcement needed), plus 1.3.1, 2.4.3 and 2.4.7.
- React Native: `accessibilityState` `expanded`, and on Android the "expand"/"collapse" `accessibilityActions`.

## Reduced motion

Detail appears and disappears instantly. Reanimated `FadeIn` and `LinearTransition` jump to their end state under `ReduceMotion.System`, but `LayoutAnimation.configureNext` must be skipped when `AccessibilityInfo.isReduceMotionEnabled()` resolves true. The state is carried by the chevron orientation, `aria-expanded`/`accessibilityState` and a visual grouping (indent, background or left border) that links the detail to its parent row.

## Keyboard

- Disclosure: Tab to the toggle, Enter or Space to toggle.
- Treegrid: Right Arrow expands a collapsed row (or moves to its first cell), Left Arrow collapses an expanded row, Enter toggles when cell focus is on the first cell, plus the grid arrow, Home/End and Ctrl+Home/End keys.
- Plain tables keep normal Tab order.

## Performance

Rendering many detail panels is the cost: mount detail lazily on expand and unmount on collapse, and fetch on demand with an in-panel loading state. Avoid height animation (layout) across large tables. `content-visibility` (Baseline newly available since 2025-09-15; Safari 26) can reduce off-screen rendering cost. With virtualization, expanded size changes must be re-measured.

## Primitives to reuse

- Web: TanStack Table 9: `useTable` with `tableFeatures({rowExpandingFeature, expandedRowModel: createExpandedRowModel()})`, the `getRowCanExpand` option, `row.getCanExpand()`, `row.getIsExpanded()`, `row.getToggleExpandedHandler()` (headless, adds no ARIA).
- Web: React Aria Components `Table` with `treeColumn`, `<Button slot='chevron'>` and `expandedKeys`; the APG treegrid and disclosure examples.
- Native: `Pressable`, Reanimated, FlashList.

## Tests

- Automated: the toggle is a button whose `aria-expanded` flips on Enter and Space; `aria-controls` points to an existing element; focus remains on the toggle; the detail row has `colspan` equal to the column count; treegrid arrow keys expand and collapse; the React Native `accessibilityState.expanded` flips.
- Visual QA: detail is clearly attached to its parent row, columns do not jump in width on expand, and several open rows remain scannable.

## State integrity

Not applicable: expanding a row changes only what is shown.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
- https://tanstack.com/table/v8/docs/guide/expanding
- https://www.nngroup.com/articles/data-tables/
- https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size

## Not verified

- The NN/g finding that users leave accordions open and clutter the table.
- That React Native `LayoutAnimation` ignores the OS Reduce Motion setting is inferred from the docs saying nothing about it, not from an explicit statement or a device test.
- The title and level of WCAG 4.1.2 were not extracted from the specification.
