---
number: 29
name: Numeric steppers
classes: [functional-feedback, error-prevention]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/
  - https://developer.apple.com/design/human-interface-guidelines/steppers
  - https://design-system.service.gov.uk/components/text-input/
  - https://base-ui.com/react/components/number-field
  - https://react-aria.adobe.com/NumberField
  - https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/examples/quantity-spinbutton/
  - https://base-ui.com/react/components/number-field.md
  - https://react-aria.adobe.com/NumberField.md
  - https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 29. Numeric steppers

Use −/+ buttons for small adjustments of a value that stays visible and typeable. Update the number instantly, mark the buttons unavailable at the bounds with `aria-disabled`, and never make a stepper the only way to enter large values.

## Use when

- Small counts adjusted by a few units (item quantity, number of copies, crew size), especially for field workers on touch with large buttons.
- Pair with a text field when values vary widely (HIG).

## Avoid when

- As the only input for values that often change by more than about 5 steps: it slows a repeated action, and typing is faster.
- Non-numeric codes (ZIP, IDs), and decimal or currency entry.
- `<input type="number">` spinners by default: GOV.UK warns of accidental increments and recommends `inputmode="numeric"`.

## Web technique

1. `<input type="text" inputmode="numeric">` for whole numbers and `inputmode="decimal"` for decimals. If the value can be negative, use `type="text"` with no `inputmode`, as GOV.UK advises since June 2026. Add a visible `<label>` and two `<button>`s; format and parse with `Intl.NumberFormat` for es/en separators.
2. React Aria NumberField or Base UI NumberField (Increment/Decrement, `smallStep`/`largeStep`, locale formatting).
3. Animate nothing on value change (no count-up or odometer). A button press state may use `transform: scale(0.96)` for under 100 ms.

## Native technique

- There is no core stepper. Use `TextInput` with `keyboardType='number-pad'` or `'decimal-pad'` plus two `Pressable`s (`hitSlop` to reach 44 pt / 48 dp), or a single element with `accessibilityRole='adjustable'` and increment/decrement `accessibilityActions`.
- Do not use the RN role `spinbutton`, which RN documents as a button that opens a list of choices.
- Haptics: `Haptics.selectionAsync` per step is optional; on Android use `performAndroidHapticsAsync(Clock_Tick or Segment_Tick)`. At a bound, `Reject` (Android) or `NotificationFeedbackType.Warning` once, not repeatedly.

## Timing

- The value updates in the same frame. Press feedback stays under 100 ms.
- Press-and-hold auto-repeat values have no source (see Not verified).
- HIG suggests Shift-click for ×10 on macOS.

## Accessibility

Per the APG Quantity Spin Button example:

- The input has `role=spinbutton` with `aria-valuenow`/`min`/`max` and `aria-invalid`; add `aria-valuetext` when units are needed.
- The −/+ buttons are `tabindex=-1` and labelled ("Increase quantity"). At a bound they get `aria-disabled='true'` instead of `disabled`, so touch and voice users can still reach them.
- A visually hidden `<output>` (polite status) announces the new value after a button press.
- Announce clamping in text (3.3.1). Button targets at least 24 px (2.5.8); 4.1.2 applies.
- RN: adjustable role plus `accessibilityValue {min,max,now,text}`.

## Reduced motion

Nothing changes, because the number itself is not animated. The button press scale can be dropped; the bound buttons' disabled state and the visible number carry the state.

## Keyboard

- Up/Down change by one step; Home/End go to the minimum/maximum when defined; Page Up/Down make larger steps (optional).
- Focus stays on the field, and typing edits directly (APG).
- Keep wheel changes off: Base UI's `allowWheelScrub` defaults to false, but React Aria NumberField needs `isWheelDisabled` set explicitly (its docs list no default).

## Performance

Trivial. Debounce server writes when each tap persists. In RN, keep the count in a small memoized component rather than re-rendering a whole list row tree per tap.

## Primitives to reuse

- Web: React Aria NumberField (locale formatting, `commitBehavior` snap/validate); Base UI NumberField (Increment, Decrement, ScrubArea, `smallStep`/`largeStep`).
- Native: `TextInput` plus `Pressable`; `@expo/ui` TextInput (inside `Host`).

## Tests

- Automated: `role=spinbutton` with a name; arrows change the value by step; Home/End reach the bounds; the buttons carry `aria-disabled="true"` at min/max, staying reachable for touch and voice users; typing "1,5" in es parses as 1.5; out-of-range input sets `aria-invalid` and either shows a text error or clamps with a message.
- Visual QA: tap targets on phone; the number does not jitter in width (`tabular-nums`); the disabled state is distinguishable.

## State integrity

- The local number may update at once.
- If each tap writes to the server (inventory counts), batch or debounce and show a pending or unsynced marker until confirmed. Never show "stock updated" or a synced checkmark before the server acknowledges.
- On conflict or failure, show both the server value and the user's intended value, never a silent overwrite.

## References

- [WAI-ARIA APG: Spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)
- [WAI-ARIA APG: Quantity Spin Button example](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/examples/quantity-spinbutton/)
- [Apple HIG: Steppers](https://developer.apple.com/design/human-interface-guidelines/steppers)
- [GOV.UK Design System: Text input](https://design-system.service.gov.uk/components/text-input/)
- [Base UI: Number Field](https://base-ui.com/react/components/number-field)
- [React Aria: NumberField](https://react-aria.adobe.com/NumberField)
- [Expo UI: universal components](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal.md)

## Not verified

- Press-and-hold auto-repeat timings (about 400 ms initial delay, then about 50–100 ms intervals, accelerating); no source found.
- The React Aria NumberField wheel default is inferred from the docs listing no default for `isWheelDisabled`; not confirmed in source code.
- The stability level of `@expo/ui` universal components; the SDK 58 docs state no alpha, beta or stable label.
