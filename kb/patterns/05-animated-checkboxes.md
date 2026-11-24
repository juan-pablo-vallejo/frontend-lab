---
number: 5
name: Animated checkboxes
classes: [functional-feedback, decorative]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/checkbox
  - https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
  - https://www.radix-ui.com/primitives/docs/components/checkbox
  - https://www.nngroup.com/articles/checkboxes-vs-radio-buttons/
  - https://bcd.developer.mozilla.org/bcd/api/v0/current/css.properties.accent-color.json
  - https://api.webstatus.dev/v1/features?q=id:accent-color
  - https://docs.expo.dev/versions/v58.0.0/sdk/checkbox.md
  - https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/checkbox.md
  - https://raw.githubusercontent.com/facebook/react-native-website/main/website/versioned_docs/version-0.88/accessibility.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 5. Animated checkboxes

The checked state appears instantly and unmistakably. Animating the check mark is optional decoration, kept under 150 ms, and never delays the state or the next click.

## Use when

- Multi-select options, opt-ins, row selection in tables and bulk actions, checklists.
- A tri-state (mixed) parent for select-all over a group (APG).

## Avoid when

- A drawn or bouncy check animation on dense tables and checklists where people tick dozens of rows in a row: it slows a repeated action and adds visual noise.
- Mutually exclusive choices: use radios.
- Triggering immediate actions (NN/g).

## Web technique

1. Native `<input type="checkbox">` with a `<label>`. Set `indeterminate` from JS for the mixed state.
2. `accent-color` for brand colour: Chrome 93, Firefox 92 and Safari 26.2 support it fully. Chrome for Android is partial because it does not keep minimum contrast (crbug 343503163), so its Baseline status is Limited. Check the control's contrast yourself rather than trusting the browser to keep it legible.
3. Custom look: `appearance: none` plus an SVG check animated by `stroke-dashoffset`, or by `opacity`/`transform: scale()`. Animate `background-color` only as a fast fade. Never animate `width`, `height` or `border-width`, which cause layout.
4. Radix Checkbox, with `Indicator` `forceMount` for an exit animation.

## Native technique

- There is no core RN checkbox.
- `expo-checkbox` (`value`, `onValueChange`, `disabled`, `color`) and the `@expo/ui` universal Checkbox (inside `Host`; `value`, `onValueChange`, `label`, `disabled`) accept a boolean only.
- For a tri-state select-all parent, build a `Pressable` with `accessibilityRole='checkbox'` and `accessibilityState {checked:'mixed'}`.
- An icon swap is enough. Haptics are usually unnecessary, and none in bulk-select lists.

## Timing

The state change is visible in the same frame. An optional check draw or scale takes 80–150 ms ease-out (Material short1 to short3 is 50–150 ms). No spring overshoot.

## Accessibility

- Native checkbox, or `role=checkbox` with `aria-checked` true/false/mixed. Space toggles.
- Group with `fieldset`/`legend` or `role=group` plus `aria-labelledby`; use `aria-describedby` for helper text (APG).
- Box border and check need 3:1 contrast (1.4.11). Make the label clickable to enlarge the target (2.5.8). 4.1.2 applies.
- RN: `accessibilityRole='checkbox'`, `accessibilityState {checked: true|false|'mixed'}`.

## Reduced motion

Remove the draw and scale and show the final check at once. The filled box and the check glyph carry the state, so nothing needs replacing. A colour or opacity fade stays allowed; it is not motion under 2.3.3.

## Keyboard

Space toggles (APG). Tab moves between checkboxes; arrow keys do nothing in a checkbox group.

## Performance

- An SVG `stroke-dashoffset` animation repaints only the small glyph.
- With hundreds of rows, avoid per-row JS animation libraries; keep CSS-only transitions.
- In long RN FlatLists, do not mount a Reanimated shared value per row where a static icon swap does the job.

## Primitives to reuse

- Web: native checkbox input; Radix UI Checkbox (`data-state` checked/unchecked/indeterminate); React Aria Checkbox and CheckboxGroup.
- Native: `expo-checkbox`; `@expo/ui` Checkbox (both boolean only).

## Tests

- Automated: Space and click toggle `aria-checked`; the parent shows `mixed` when some children are checked, and setting the parent sets every child; the form submits the value; no animation delays the `checked` attribute.
- Visual QA: border and check contrast in both themes and in the disabled state; the indeterminate glyph is distinct from checked; rapid clicking neither drops nor flickers states.

## State integrity

- In a form, the check is local intent only; do not imply it is saved.
- Where a check persists at once (a checklist task marked done, bulk-select followed by an action), follow the switch rule: optimistic tick with a pending cue, "done" only after the server confirms, and revert with an error on failure.

## References

- [WAI-ARIA APG: Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
- [MDN: input type=checkbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/checkbox)
- [WCAG 2.2 Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [Radix UI: Checkbox](https://www.radix-ui.com/primitives/docs/components/checkbox)
- [NN/g: Checkboxes vs. radio buttons](https://www.nngroup.com/articles/checkboxes-vs-radio-buttons/)
- [BCD data: accent-color](https://bcd.developer.mozilla.org/bcd/api/v0/current/css.properties.accent-color.json)
- [webstatus.dev: accent-color](https://api.webstatus.dev/v1/features?q=id:accent-color)
- [Expo: expo-checkbox](https://docs.expo.dev/versions/v58.0.0/sdk/checkbox.md)
- [Expo UI: universal Checkbox](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/checkbox.md)
- [React Native 0.88: Accessibility](https://raw.githubusercontent.com/facebook/react-native-website/main/website/versioned_docs/version-0.88/accessibility.md)

## Not verified

- The stability level of `@expo/ui` universal components; the SDK 58 docs state no alpha, beta or stable label.
- The NN/g claims on this page were not opened by the first reader.
