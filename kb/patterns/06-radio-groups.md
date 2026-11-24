---
number: 6
name: Radio groups
classes: [functional-feedback, error-prevention]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/radio/
  - https://www.nngroup.com/articles/checkboxes-vs-radio-buttons/
  - https://www.radix-ui.com/primitives/docs/components/radio-group
  - https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
  - https://docs.expo.dev/versions/latest/sdk/ui/universal.md
  - https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements.md
  - https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/segmentedcontrol.md
  - https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/picker.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (5 corrections applied).
---

# 6. Radio groups

Use radios for exactly one choice among a few visible options. Show the selection instantly with a filled dot and the arrow-key behaviour, and never use radios to trigger actions or navigation.

## Use when

- 2 to about 7 mutually exclusive options that are better seen all at once (shift type, priority, payment method).
- Preselect a sensible default, or add an explicit "None" option (NN/g).

## Avoid when

- Many options: use a select or combobox.
- Multi-select: use checkboxes.
- An immediate action or page change (NN/g).
- Horizontal layouts of long Spanish labels that wrap ambiguously: stack them vertically.

## Web technique

1. Native `<fieldset><legend>` with `<input type="radio" name>` and `<label>`; `accent-color` for colour (see the checkbox page on support).
2. Custom look via `appearance: none`, with the inner dot animated by `transform: scale()` and `opacity`. Never animate `border-width` or size, which cause layout.
3. Radix RadioGroup or React Aria RadioGroup when custom markup is needed.
4. Card-style radios: keep the input and style the parent with `:has(:checked)` (BCD: Chrome 105, Firefox 121, Safari 15.4).

## Native technique

- There is no core radio. Build `Pressable` rows inside a `View` with `accessibilityRole='radiogroup'`; give each row `accessibilityRole='radio'` and `accessibilityState {checked}`.
- Alternatives: the `@expo/ui` universal Picker (menu or wheel, wrapped in `Host`), or the SegmentedControl drop-in for a segmented look.
- Import the drop-in with `import SegmentedControl from '@expo/ui/community/segmented-control'` (the docs' path, not the package root). It keeps the `@react-native-segmented-control` API (`selectedIndex`, `onChange`, `onValueChange`).
- The Picker's wheel appearance is iOS only; Android and web fall back to a dropdown. Neither Picker appearance keeps every option visible the way radios do.
- `Haptics.selectionAsync` on change is optional.

## Timing

The dot appears in the same frame; an optional scale-in of 80–150 ms with standard easing. No travel animation between options.

## Accessibility

- `role=radiogroup` containing `role=radio` items with `aria-checked` (APG); native `fieldset`/`legend` names the group.
- Roving tabindex: Tab lands on the checked radio, or on the first radio when none is checked.
- 1.3.1 and 4.1.2 apply; 1.4.11 needs 3:1 for outline and dot; 2.5.8 targets apply (make the whole label clickable).
- A group-level error goes in `aria-describedby` on the `fieldset` or radiogroup.
- RN: `accessibilityRole` radiogroup/radio with `accessibilityState.checked`.

## Reduced motion

Show the dot at once with no scale. The filled dot plus a bold or outlined selected row carries the state, so nothing is lost.

## Keyboard

- Tab and Shift+Tab move into and out of the group: focus lands on the checked radio, or on the first radio when none is checked (some browsers send Shift+Tab to the last native radio).
- Space checks the focused radio.
- Down/Right and Up/Left move to and check the next or previous radio, wrapping around.
- In a toolbar, arrows move focus only.
- Radix docs say Up/Left only move focus, which differs from APG; verify before adopting.

## Performance

Negligible; CSS only. `:has()` on large forms is fine for a few groups. Avoid per-option JS animation in long virtualized lists.

## Primitives to reuse

- Web: native radio inputs; Radix UI RadioGroup (roving tabindex, `loop` defaults to true); React Aria RadioGroup.
- Native: `@expo/ui` Picker (menu, or wheel on iOS only; inside `Host`) or the SegmentedControl drop-in from `@expo/ui/community/segmented-control`; or a custom `Pressable` radiogroup.

## Tests

- Automated: `getByRole('radiogroup', {name})`; arrow keys move focus and checked state together and wrap; only one radio is checked; Tab enters at the checked item; a required group with no selection reports an error linked by `aria-describedby`.
- Visual QA: the selected state reads without colour; focus is visible; labels are clickable; Spanish labels do not truncate.

## State integrity

- In forms the selection is local intent; NN/g says a radio change should take effect only on a command button.
- If a group must auto-save, arrow keys check every radio they pass: debounce, abort superseded requests and apply only the latest response.
- Show a pending cue, then confirm or revert. Never show "Status updated" before the server confirms.

## References

- [WAI-ARIA APG: Radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)
- [NN/g: Checkboxes vs. radio buttons](https://www.nngroup.com/articles/checkboxes-vs-radio-buttons/)
- [Radix UI: Radio Group](https://www.radix-ui.com/primitives/docs/components/radio-group)
- [WCAG 2.2 Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [Expo UI: universal components](https://docs.expo.dev/versions/latest/sdk/ui/universal.md)
- [Expo UI: drop-in replacements](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements.md)
- [Expo UI: SegmentedControl drop-in](https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/segmentedcontrol.md)
- [Expo UI: universal Picker](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/picker.md)

## Not verified

- The NN/g range of "2 to about 7 options" was not found in the article text read; only the default-selection, "None" option and vertical-layout advice were confirmed.
- The stability level of `@expo/ui` universal components; the SDK 58 docs state no alpha, beta or stable label.
