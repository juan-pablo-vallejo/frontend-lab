---
number: 22
name: Accordions
classes: [comprehension, navigation]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
  - https://www.nngroup.com/articles/accordions-on-desktop/
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details
  - https://developer.chrome.com/docs/css-ui/animate-to-height-auto
  - https://api.webstatus.dev/v1/features/details-content
  - https://docs.expo.dev/versions/latest/sdk/ui/universal/collapsible.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 22. Accordions

Use native details/summary or the APG accordion. Animate height only briefly, as an enhancement. Allow several sections open, and never auto-collapse sections users compare.

## Use when

Optional form sections, settings groups, secondary record details, FAQ-like independent chunks, and long mobile pages.

## Avoid when

- Users need most sections: show everything.
- Content is compared across sections.
- Content is critical.
- Fields office staff edit every time: keep them expanded or remember the state.
- Collapsing sections inside virtualized lists.

## Web technique

- Use `<details>`/`<summary>`. The `name` attribute gives exclusive groups (Baseline newly available 2024-09), but NN/g advises against auto-closing.
- Animate with `::details-content` (Baseline newly available 2025-09) plus `interpolate-size: allow-keywords`, which is Limited to Chromium and so falls back to instant.
- If heading structure matters, use the APG heading > button with `aria-expanded` and `hidden="until-found"` (Limited on webstatus.dev) to keep find-in-page.
- Rotate the chevron with transform.
- Never animate padding or margin, and avoid height animation in long lists.

## Native technique

- Prefer `@expo/ui` universal `Collapsible` (Android, iOS, web) or SwiftUI `DisclosureGroup` (iOS).
- Custom: a `Pressable` header with `accessibilityRole="button"` and `accessibilityState {expanded}`, content with a Reanimated `FadeIn` entering animation, and siblings with `layout={LinearTransition}` (300 ms default; shorten it).
- No haptic.

## Timing

- Expand in 150 to 250 ms with standard easing `cubic-bezier(0.2,0,0,1)`; collapse in the same time or less.
- No overshoot springs.

## Accessibility

- A heading (correct `aria-level`) contains only a button with `aria-expanded` and `aria-controls`.
- `role=region` with `aria-labelledby` is optional; skip it beyond about 6 panels.
- Focus stays on the header.
- Collapsed content must be hidden from assistive technology, not only clipped.
- WCAG 1.3.1, 2.1.1 and 4.1.2 apply.
- In RN: `accessibilityState {expanded}`, and Android expand/collapse `accessibilityActions`.

## Reduced motion

Content appears instantly and the icon flips instantly. `aria-expanded`, the icon state and the presence of the content carry the state; no motion substitute is needed.

## Keyboard

- Enter or Space toggles the focused header.
- Tab and Shift+Tab move through every header and all focusable content in the page tab sequence.
- The current APG accordion pattern defines no arrow, Home or End keys, so do not add them by default.

## Performance

Not compositor-only: height animation forces layout every frame and shifts everything below. Keep it short, or skip it for large content and inside `FlatList`/virtualized rows, where height changes force re-measurement.

## Primitives to reuse

- Web: native `details`/`summary`, Radix `Accordion`, React Aria `Disclosure`/`DisclosureGroup`, Base UI `Accordion`.
- Native: `@expo/ui` universal `Collapsible` (Android, iOS, web), `@expo/ui` `DisclosureGroup` (iOS), Reanimated layout transitions.

## Tests

- Automated: `aria-expanded` matches visibility; collapsed content is absent from the accessibility tree; Enter/Space toggle; a section containing validation errors auto-expands on submit; find-in-page reveals content when `until-found` is used.
- Visual QA: no clipped content mid-animation, no scroll jump, consistent chevron direction.

## State integrity

Not applicable. Never let a collapsed section hide unsaved changes or errors; expand it, or badge the header.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
- https://www.nngroup.com/articles/accordions-on-desktop/
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details
- https://developer.chrome.com/docs/css-ui/animate-to-height-auto
- https://api.webstatus.dev/v1/features/details-content

## Not verified

- Whether the `@expo/ui` universal `Collapsible` announces its expanded or collapsed state to VoiceOver and TalkBack was not checked.
