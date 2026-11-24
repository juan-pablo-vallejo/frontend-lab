---
number: 45
name: Undo interactions
classes: [error-prevention, functional-feedback]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.nngroup.com/articles/confirmation-dialog/
  - https://developer.apple.com/design/human-interface-guidelines/undo-and-redo
  - https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
  - https://sonner.emilkowal.ski/toast
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md
  - https://sonner.emilkowal.ski/toaster
  - https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/
  - https://github.com/emilkowalski/sonner/blob/main/src/index.tsx
  - https://react-aria.adobe.com/Toast.md
  - https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.88/accessibilityinfo.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (4 corrections applied).
---

# 45. Undo interactions

Prefer undo over confirmation for routine reversible actions. Name what will be undone, keep the window long enough and reachable without the toast, and make undo truly reverse server state.

## Use when

Routine, frequent, reversible actions such as delete, archive, move, bulk status change, reassign or a swipe commit. NN/g says confirmations for routine actions breed habituation, and undo is the stronger safeguard.

## Avoid when

- Relying on undo alone for irreversible or externally visible effects (payment sent, SMS to a customer, legal submission): confirm those, naming the outcome on the buttons.
- Offering an undo you cannot honour, for example after the server has already propagated the change.

## Web technique

1. Show an action toast or snackbar ("3 orders archived · Undo") inside a persistent `role=status` region; do not steal focus. Handle Ctrl/Cmd+Z in the list that owns the action (see Keyboard), and keep a lasting route such as a Trash, Recently deleted or an activity log.
2. Animate the toast with `opacity` and `translate` only, using `@starting-style` (Baseline 2024) for entry.
3. Sonner 2.0.8: action button, default duration 4000 ms; raise it to ≥8–10 s for undo, and set `<Toaster visibleToasts={1}>` to keep one snackbar at a time, per Material.

## Native technique

- A custom snackbar `View` animated with Reanimated `entering` `FadeInDown` and `exiting` `FadeOut` (React Native has no core snackbar).
- `accessibilityRole='button'` on "Deshacer/Undo"; announce via `AccessibilityInfo.announceForAccessibility`.
- Android: compute the snackbar duration with `AccessibilityInfo.getRecommendedTimeoutMillis(baseMs)`. iOS: when `AccessibilityInfo.isScreenReaderEnabled()` resolves true, keep the snackbar until it is dismissed or acted on. Keep Undo reachable from a persistent screen such as Recently deleted.
- Android Material Snackbar defines `LENGTH_SHORT`, `LENGTH_LONG` and `LENGTH_INDEFINITE` and dismisses when the action is tapped.
- Haptics: none on show; `notificationAsync(Success)` is optional on restore, but avoid it for frequent undos (Apple: avoid overuse).

## Timing

- Toast entry 150–250 ms ease-out; exit 100–150 ms ease-in.
- Undo stays available 8–10 s or longer (Sonner's 4 s default is too short; a heuristic).
- Sonner pauses the timer while the toast stack is hovered or focused, during pointer interaction and while the tab is hidden.
- Restore animations follow pattern 39 in reverse.

## Accessibility

- A polite live region (`role=status`) present before the message, for example "Order 1042 deleted. Undo available, Ctrl+Z"; never `role=alert`.
- A disappearing toast is a time limit under WCAG 2.2.1 unless the user has another way to the same function, so keep the persistent route or let users extend the time.
- After undo, highlight and scroll to the restored item (Apple HIG: show the results of an undo) and return focus to it.
- WCAG 4.1.3, 2.2.1, 3.3.4, 2.4.3.
- React Native: `accessibilityRole='button'` and an announcement; Android-only `accessibilityLiveRegion='polite'` on the snackbar text.

## Reduced motion

The snackbar appears and disappears without sliding (opacity only, or instant). The restored item reappears in place with a static highlight and focus, so the restore is clear without movement.

## Keyboard

- Undo button: Tab, then Enter or Space.
- Handle Ctrl/Cmd+Z only while focus is in the list or table that owns the action, never in inputs, textareas or `contenteditable`, and expose it with `aria-keyshortcuts` on the Undo button.
- Sonner has no Escape-to-dismiss (Escape only collapses its expanded stack); add a handler scoped to focus inside the toast if you want one.

## Performance

Trivial when animating `transform` and `opacity`. The cost is in state: pending operations must survive navigation, app backgrounding and offline queues on field devices.

## Primitives to reuse

- Web: Sonner toast with action; React Aria Toast, which ships as `UNSTABLE_Toast`, `UNSTABLE_ToastRegion` and `UNSTABLE_ToastQueue`, pauses on hover and focus and recommends a 5 s minimum timeout; native `<button>`.
- Native: Reanimated `entering`/`exiting`; `AccessibilityInfo`; the Material Snackbar pattern as the platform convention on Android.

## Tests

- Automated: after the action, status text names the object and the count (EN and ES plurals); Undo restores the exact prior state including position and selection; Ctrl/Cmd+Z works when focus is in the list; the timer pauses on focus; a server-side undo failure surfaces an error.
- Visual QA: the toast does not cover the bottom navigation or the primary action, there is one toast at a time, and the restored item is visibly highlighted.

## State integrity

Choose one model per action.

- Deferred: hide locally and commit after the window, but persist the pending operation so a closed app still commits or cancels it deterministically.
- Soft delete: commit now; undo calls a restore endpoint.

Show "Deleted" immediately only if rollback is guaranteed. Show "Restored" only after the server confirms the restore; on failure, say the undo failed and leave the item in its true state.

## References

- https://www.nngroup.com/articles/confirmation-dialog/
- https://developer.apple.com/design/human-interface-guidelines/undo-and-redo
- https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
- https://sonner.emilkowal.ski/toast
- https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md

## Not verified

- Ctrl/Cmd+Z as an in-app undo shortcut is a platform convention, not confirmed as a web standard.
- Android Material Snackbar dismissing when its action is tapped (`LENGTH_*` constants and one-at-a-time were confirmed).
- Apple HIG undo guidance, and the NN/g claim that routine confirmations breed habituation.
- Apple guidance to avoid overusing haptics (HIG haptics page not opened).
- Sonner behaviour with `visibleToasts={1}` when a second undo toast arrives (whether the first undo stays reachable).
- That an auto-dismissing toast is a time limit under WCAG 2.2.1 (Understanding document not opened).
