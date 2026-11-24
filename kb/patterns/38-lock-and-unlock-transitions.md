---
number: 38
name: Lock and unlock transitions
classes: [functional-feedback, error-prevention, comprehension]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/switch/
  - https://www.nngroup.com/articles/toggle-switch-guidelines/
  - https://reactnative.dev/docs/switch
  - https://developer.apple.com/design/human-interface-guidelines/playing-haptics
  - https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/checkbox
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/readonly
  - https://api.webstatus.dev/v1/features?q=name:switch
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (1 correction applied).
---

# 38. Lock and unlock transitions

Locking or unlocking a record or control shows the new state in label, icon and the affected UI (editable or read-only) at once. A shackle animation is optional and secondary.

## Use when

Records that can be locked against edits (closed jobs, approved timesheets, signed inspections), screen or field locks, and check-out of a work order by one worker.

## Avoid when

- A padlock animation as the only indication; the fields themselves must become read-only.
- Confirmation dialogs for routine, reversible locks; offer undo instead.
- Optimistic unlocks that let users edit data that may still be locked server-side.

## Web technique

- Use `<button aria-pressed>` with a constant "Lock record" label, or `<input type=checkbox role=switch>` labelled "Locked". Never rely on the `switch` attribute.
- Set `readonly` on text fields (still focusable and readable) and `disabled` on select, checkbox and radio, plus a visible "Locked by …" banner.
- The optional icon change is a CSS transition on the shackle's `transform: translateY`/`rotate` and `opacity`.
- Do not animate layout properties, and do not use a library.

## Native technique

- RN `Switch` (controlled: it reverts unless `value` is updated in `onValueChange`), or `Pressable` with `accessibilityRole` switch or togglebutton.
- Set `editable={false}` or `accessibilityState {disabled}` on locked inputs.
- Animate the optional shackle with a Reanimated transform using `ReduceMotion.System`.
- Haptic: `notificationAsync(Success)` when the server confirms (Apple lists unlocking a vehicle as a notification-haptic example), or `performAndroidHapticsAsync(Toggle_On/Toggle_Off)` at the confirmed flip.

## Timing

- State change 150 to 250 ms ease-out.
- The optional shackle movement stays within the same window, and the lock state is readable before it finishes.
- If the server round trip exceeds about 1 s, show a "Locking…" pending state.

## Accessibility

- APG Switch: role `switch` with `aria-checked`, Space (Enter optional), label unchanged when state changes. Or Button: `aria-pressed` with a constant label.
- If the label flips "Lock"/"Unlock" ("Bloquear"/"Desbloquear"), drop `aria-pressed`.
- Announce the confirmed result once through `role=status` ("Record locked"). Focus stays on the control.
- WCAG at stake: 4.1.2, 1.4.1 (icon plus text, not colour alone), 3.3.4 when the lock finalises legal, financial or data submissions, 4.1.3.
- React Native: `accessibilityRole` switch with `accessibilityState {checked}`, plus the disabled state on the locked fields.

## Reduced motion

No shackle movement: an instant icon swap (open to closed padlock) with a text label "Locked" / "Bloqueado", and the fields visibly switching to read-only styling. Those carry all the information.

## Keyboard

- Switch: Space toggles, Enter is optional (APG Switch).
- Toggle button: Enter and Space.
- Focus remains on the control after toggling.

## Performance

- The transform and opacity icon animation is compositor-only.
- Changing many fields to read-only re-renders the form, so batch it in one state update.
- Avoid per-field animations in long forms.

## Primitives to reuse

- Web: React Aria `Switch` or `ToggleButton`, Radix Toggle.
- Native: RN `Switch` (controlled), `Pressable` with role switch.

## Tests

- `aria-checked` or `aria-pressed` (native: `accessibilityState.checked`) changes only after a mocked confirm.
- Locked fields reject input.
- The label stays constant when `aria-pressed` is used.
- The status message is announced.
- A failure reverts the control and shows an error.
- Visual QA: the locked state is distinguishable in greyscale and sunlight, EN and ES label widths do not shift layout, and the "locked by" attribution is visible.

## State integrity

- Locking: you may make fields read-only locally right away (the safe direction) with a "Locking…" status, but do not claim "Locked for everyone" until the server confirms.
- Unlocking: do not enable editing until the server confirms the lock is released, to avoid conflicting writes.
- On failure, restore the prior state visibly.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/switch/
- https://www.nngroup.com/articles/toggle-switch-guidelines/
- https://reactnative.dev/docs/switch
- https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/checkbox
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/readonly
- https://api.webstatus.dev/v1/features?q=name:switch

## Not verified

- The NN/g toggle-switch guidelines page was not opened.
- Whether a controlled RN `Switch` visibly flips and snaps back while awaiting server confirmation.
- The 150 to 250 ms timing has no primary source.
