---
number: 23
name: Modal transitions (dialogs, sheets, side panels)
classes: [navigation, error-prevention, comprehension]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
  - https://www.nngroup.com/articles/modal-nonmodal-dialog/
  - https://reactnative.dev/docs/modal
  - https://docs.expo.dev/router/advanced/modals/
  - https://raw.githubusercontent.com/material-components/material-components-android/master/lib/java/com/google/android/material/motion/res/values/tokens.xml
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overlay
  - https://api.webstatus.dev/v1/features/transition-behavior
  - https://api.webstatus.dev/v1/features/overlay
  - https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
  - https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html
  - https://reactnative.dev/docs/accessibilityinfo
  - https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/bottomsheet.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (4 corrections applied).
---

# 23. Modal transitions (dialogs, sheets, side panels)

Use native dialogs and system sheets with a short fade and a small translate from the edge or trigger. Move focus in, return it on close, and never delay input.

## Use when

- A modal: critical confirmations, input that blocks progress, or a focused sub-task (NN/g).
- A non-modal side panel: editing a record while the list stays visible.
- A mobile sheet: a short task.

## Avoid when

- Non-critical information.
- Quick repeated edits: inline editing or a non-modal panel is faster.
- Stacked modals (Apple: one sheet at a time).
- Long multi-step work: use a full screen or route.
- Decisions that need information the modal covers.

## Web technique

- Use `<dialog>` with `showModal()` (widely available) for top layer, inert background and Esc.
- `closedby="any"` is Limited (no Safari), so handle backdrop clicks in code. `command`/`commandfor` invokers became Baseline newly available in December 2025.
- Animate opacity plus transform: `translateY` 8 to 16px or scale 0.96 to 1 for centered dialogs, `translateX(100%)` for side panels, `translateY(100%)` for bottom sheets.
- Use `@starting-style` with `display` and `overlay` set to `allow-discrete`. `overlay` is Limited to Chromium: in Firefox and Safari the dialog leaves the top layer as soon as it closes, so its `::backdrop` vanishes at once and the fading dialog may be mis-layered. Treat exit motion as progressive enhancement; never gate focus return or submit handling on `transitionend`.
- Fade `::backdrop` through `background-color`.
- Never animate width, height, top/left or `backdrop-filter` blur.
- Non-modal panels use `popover="manual"` or a plain region without `aria-modal`.

## Native technique

- RN `Modal`: `animationType` slide/fade; `presentationStyle` pageSheet/formSheet on iOS; `onRequestClose` required for Android back.
- Expo Router presentation `'modal'`/`'formSheet'` with `sheetAllowedDetents` (Android max 3).
- Prefer Expo Router formSheet or the `@expo/ui` drop-in `BottomSheet` (gorhom-compatible API over SwiftUI `BottomSheet`, Compose `ModalBottomSheet` and a web dialog).
- `@gorhom/bottom-sheet` 5.2.14 was last released 2026-05-09; its compatibility with Gesture Handler 3.5, Reanimated 4.8 and React Native 0.88 is not verified, so test before adopting.
- No haptic on open.

## Timing

- Enter in 200 to 300 ms (M3 short4 200 ms to medium2 300 ms) with emphasized-decelerate `cubic-bezier(0.05,0.7,0.1,1)`.
- Exit in 150 to 200 ms with emphasized-accelerate `cubic-bezier(0.3,0,0.8,0.15)`.
- Sheets use the M3 standard default spatial spring (damping 0.9, stiffness 700) with no visible bounce.

## Accessibility

- Use `role=dialog`, or `alertdialog` for brief interrupting messages. Set `aria-modal` only when outside interaction is truly blocked, and name the dialog with `aria-labelledby`.
- Focus the first control, a static title for long content, or the least destructive action for irreversible steps; trap Tab; Esc closes; return focus to the invoker.
- WCAG 2.1.1, 2.4.3, 2.4.11 (a proper modal passes) and 4.1.2 apply.
- WCAG 2.5.7 Dragging Movements applies to sheets dismissed or resized by drag: provide a single-pointer alternative (Close button, tappable detent control).
- WCAG 2.1.2 is met because Esc and Close leave the trap.
- In RN: `aria-modal`/`accessibilityViewIsModal` on iOS, `onRequestClose` on Android, and on open `AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus')` on a view with `accessible={true}`.

## Reduced motion

Replace the slide or scale with a crossfade of 150 ms or less, or appear instantly. The dimmed backdrop and focus moving to the title convey the new layer. On iOS, `prefersCrossFadeTransitions` means a crossfade; Reanimated springs resolve to `toValue` immediately.

## Keyboard

- Tab/Shift+Tab cycle inside and wrap.
- Esc closes; if closing would lose edits, confirm or keep a draft.
- Enter submits forms.
- A visible Close or Cancel button sits in the tab order (APG dialog).

## Performance

Compositor-only with transform and opacity. `backdrop-filter` blur is a paint-heavy risk on low-end machines. Mount heavy dialog content before the animation starts, not during it. Use scroll locking plus `scrollbar-gutter` to avoid page shift. In RN keep sheet gestures on the UI thread (Reanimated worklets).

## Primitives to reuse

- Web: native `dialog`, Radix `Dialog`/`AlertDialog`, React Aria `Modal`/`Dialog`, Base UI `Dialog`.
- Native: RN `Modal`, Expo Router formSheet, the `@expo/ui` drop-in `BottomSheet` (over SwiftUI `BottomSheet` and Compose `ModalBottomSheet`), `@gorhom/bottom-sheet` (test before adopting).

## Tests

- Automated: focus moves inside on open and is trapped; Esc and Android back close; focus returns to the invoker; the background is inert; the submit button cannot fire twice during the exit animation.
- Visual QA: no page shift behind, safe areas respected, the soft keyboard does not cover sheet inputs, backdrop contrast is adequate.

## State integrity

For a dialog that submits: keep it open with an in-button pending state until the server confirms, then close and report success. On failure keep the inputs and show the error inside the dialog. Never close optimistically for destructive or financial actions.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- https://www.nngroup.com/articles/modal-nonmodal-dialog/
- https://reactnative.dev/docs/modal
- https://docs.expo.dev/router/advanced/modals/

## Not verified

- How Firefox and Safari paint a dialog exit without `overlay` was reasoned from the MDN `overlay` page and webstatus data, not tested in a browser.
- `@gorhom/bottom-sheet` 5.2.14 on Gesture Handler 3.5.0, Reanimated 4.8.0 and React Native 0.88: its peer ranges allow them, but nothing was run.
- The `@expo/ui` SwiftUI `BottomSheet` exists; its default detents and motion were not checked.
- The NN/g modal article was not opened, and the APG dialog-modal page was not re-opened by the second reader.
