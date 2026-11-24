---
number: 24
name: Toast notifications
classes: [functional-feedback, error-prevention]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
  - https://www.nngroup.com/articles/indicators-validations-notifications/
  - https://react-aria.adobe.com/Toast
  - https://sonner.emilkowal.ski/toast
  - https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/snackbar.md
  - https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/SnackbarHost.kt
  - https://sonner.emilkowal.ski/toaster
  - https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/react-aria/src/toast/useToast.ts
  - https://raw.githubusercontent.com/emilkowalski/sonner/main/src/index.tsx
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 24. Toast notifications

Use toasts only for brief, non-critical confirmation of user actions, often with Undo. Never for errors needing action. Announce politely, show at least 5 seconds, pause on hover/focus.

## Use when

- The result of a user action lands away from the user's gaze, such as a bulk action or a background save or sync completing.
- Undo after archive or delete.

## Avoid when

- Errors and validation: go inline (NN/g documents a missed error toast).
- Anything the user must act on.
- Results already visible inline, such as an updated row.
- Rapid repeated actions, where stacked toasts slow down field workers.
- Information available nowhere else: it becomes a WCAG 2.2.1 time limit.

## Web technique

- Render a persistent labelled region with `role=status` (`aria-live=polite`) at page load and insert the text into it.
- Animate `translateY` and opacity with `@starting-style` and `allow-discrete`, or with View Transitions as the React Aria Toast example does (400 ms slide; shorten it).
- Libraries: Sonner 2.0.8 (default duration 4000 ms; raise to 5000 or more) or React Aria Toast (F6 landmark).
- React Aria Toast renders each toast as `role=alertdialog` with `role=alert` content (assertive), which conflicts with the `role=status` rule for routine success; prefer Sonner (`aria-live=polite`) there.
- Sonner pauses timers on hover, Alt+T expansion, pointer interaction and hidden tabs, not on Tab focus; set duration to 5000 ms or more and test keyboard access to Undo.
- Never animate stack height or top; stack with transform.

## Native technique

- Android: `@expo/ui` `SnackbarHost.showSnackbar` with duration `'long'` (Compose 10000 ms; Short is 4000 ms, below the 5 s floor). With an `actionLabel` it defaults to `'indefinite'`. Compose scales the timeout through the accessibility manager's recommended timeout.
- iOS: a custom Reanimated view plus `announceForAccessibilityWithOptions(msg,{queue:true})`.
- Haptic only for user-started background results.

## Timing

- Enter in 150 to 250 ms with decelerate easing; exit in 100 to 150 ms with accelerate easing.
- Visible at least 5 s (React Aria), longer or persistent when there is an action.
- Timers pause on hover or focus.

## Accessibility

- Use `role=status` for success. `role=alert` is reserved for important, time-sensitive messages; overusing it is a listed 4.1.3 failure.
- Do not move focus.
- Keep toasts out of the way of focused elements (2.4.11); margin placement can pass.
- 2.2.1 applies when the content exists nowhere else.
- In RN: Android `accessibilityLiveRegion="polite"`, iOS `announceForAccessibility`, and localized English and Spanish strings.

## Reduced motion

The toast appears and leaves with opacity only, or instantly. The text and the live-region announcement carry all of the information, so nothing is lost.

## Keyboard

- F6 / Shift+F6 move to the toast landmark region (a React Aria convention, not APG).
- In Sonner the `Toaster` hotkey defaults to Alt/Option+T.
- Tab reaches the action and close buttons.
- When the last toast closes, focus returns to where it was.
- Esc-to-dismiss is a library-specific behaviour; verify it per library.

## Performance

Compositor-only with transform and opacity. Cap visible toasts at about 3. In RN, avoid a context provider that re-renders the whole screen per toast.

## Primitives to reuse

- Web: Sonner, React Aria Toast, Radix Toast (not opened in this run).
- Native: `@expo/ui` `Snackbar` (Compose), Material Snackbar semantics.

## Tests

- Automated: the live region exists before the message is inserted; the text appears in `role=status`; the timer is at least 5 s and pauses on hover and focus; Undo reverts the server state; the toast never fully covers the focused element.
- Visual QA: Spanish text length, stacking order, no overlap with the bottom nav or safe area on phones.

## State integrity

- Show "Saved" or "Sent" only after the server confirms; before that show "Saving…" (a loading or promise toast) or inline pending.
- When data is queued offline, say "Saved on this device, will sync", never "Synced".
- An Undo toast may appear immediately only if the commit is deferred or soft-deleted and reversible.
- On failure, convert to a persistent error with Retry; it must not fade away.

## References

- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
- https://www.nngroup.com/articles/indicators-validations-notifications/
- https://react-aria.adobe.com/Toast
- https://sonner.emilkowal.ski/toast

## Not verified

- Esc dismissing a focused toast is not covered on the React Aria Toast page.
- Sonner behaviour (4000 ms default, Alt+T hotkey, Esc collapsing the stack, no pause on Tab focus) was read from the main-branch source at package version 2.0.8, not exercised.
- Radix Toast was not opened.
