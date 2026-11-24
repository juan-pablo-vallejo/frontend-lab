---
number: 35
name: Floating form labels
classes: [comprehension, decorative]
tier: rarely-justified
status: researched
date: 2026-11-23
sources:
  - https://www.nngroup.com/articles/form-design-placeholders/
  - https://getbootstrap.com/docs/5.3/forms/floating-labels/
  - https://design-system.service.gov.uk/components/text-input/
  - https://web.dev/articles/animations-guide
  - https://bcd.developer.mozilla.org/bcd/api/v0/current/css.selectors.autofill.json
  - https://raw.githubusercontent.com/material-components/material-web/main/README.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 35. Floating form labels

Default to static labels above fields. Floating labels only save space and add risks (small text, low contrast, mistaken prefilled values); use them only when a design system requires it.

## Use when

- Matching an existing design system that requires them (for example Material outlined text fields).
- Severely space-constrained mobile forms with few fields.
- Even then, the label stays visible after it floats.

## Avoid when

- Dense operational forms used all day: static labels above fields scan faster, are less often mistaken for entered or default values, and leave room for hints and errors (NN/g; GOV.UK places labels above).
- Longer Spanish translations, which truncate when scaled down.
- Selects, dates and multi-line hints.

## Web technique

- Preferred: a static `<label>` above the input, with hints in a separate element referenced by `aria-describedby`. Never use the placeholder as the label.
- If floating is required: put the input before the label, set `placeholder=" "`, and float with `:focus ~ label, :not(:placeholder-shown) ~ label` (Chrome 47, Firefox 51, Safari 9).
- Do not rely on `:autofill` alone, because Firefox matches only username and password fields. Check the value on mount as well.
- Animate only `transform` and `opacity` (Bootstrap uses 100 ms). Never animate `font-size`, `top` or `padding`.

## Native technique

- Prefer a static `Text` label above the `TextInput`.
- If floating: Reanimated `translateY` plus scale on the label, driven by focus or a non-empty value, with `pointerEvents='none'` on the label.
- The `TextInput` still needs an `accessibilityLabel` matching the visible label. No haptics.

## Timing

100–150 ms, with standard easing `cubic-bezier(0.2,0,0,1)` or ease-in-out (Bootstrap uses 100 ms). No spring.

## Accessibility

- A real `<label for>` stays the accessible name (1.3.1, 3.3.2, 4.1.2), and Label in Name (2.5.3) stays consistent.
- Floated label text still meets 4.5:1 text contrast (1.4.3). Bootstrap's default `.65` opacity may fail; check it.
- Do not hide the hint in the placeholder.
- Errors go below the field, through `aria-describedby` and `aria-invalid`.
- RN: `accessibilityLabel` on the `TextInput` equals the visible label, with `accessibilityHint` for hints.

## Reduced motion

The label jumps to its floated position, or cross-fades between the two positions with no translate or scale. The visible label text carries the field's identity and stays readable in both states.

## Keyboard

Not applicable as a widget: the label adds no interaction. Standard text-input keys apply, and the animation must not trap or delay focus.

## Performance

`transform` and `opacity` only, which the compositor handles. Animating `font-size` or `top` triggers layout on every frame. Long forms need no `will-change`.

## Primitives to reuse

- Web: native label and input; Bootstrap 5.3 `.form-floating` (reference CSS technique). Material Web's `md-outlined-text-field` exists, but `@material/web` is in maintenance mode pending new maintainers, so do not adopt it for new work.
- Native: `TextInput` plus `Text`; `@expo/ui` TextInput (inside `Host`).

## Tests

- Automated: every input has an accessible name equal to its visible label; the label is floated when the field has a value on load or after autofill; the label never overlaps the text; the error is linked through `aria-describedby`.
- Visual QA: floated label contrast of at least 4.5:1; Spanish strings at 200% zoom with no truncation; empty and filled fields distinguishable at a glance.

## State integrity

Not applicable: the label reflects local field state only and implies nothing about saved data.

## References

- [NN/g: Placeholders in form fields](https://www.nngroup.com/articles/form-design-placeholders/)
- [Bootstrap 5.3: Floating labels](https://getbootstrap.com/docs/5.3/forms/floating-labels/)
- [GOV.UK Design System: Text input](https://design-system.service.gov.uk/components/text-input/)
- [web.dev: Animations guide](https://web.dev/articles/animations-guide)
- [BCD data: :autofill](https://bcd.developer.mozilla.org/bcd/api/v0/current/css.selectors.autofill.json)
- [Material Web README](https://raw.githubusercontent.com/material-components/material-web/main/README.md)

## Not verified

- The NN/g claims specific to floating labels (mistaken for entered values, slower scanning); the page was fetched but its floating-label section was not read in detail.
- Whether `:placeholder-shown` stops matching for Chrome fields autofilled on load before any user interaction; not tested.
- The stability level of `@expo/ui` universal components; the SDK 58 docs state no alpha, beta or stable label.
