---
number: 55
name: Error recovery interactions (retry, resume, restore)
classes: [functional-feedback, error-prevention]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.nngroup.com/articles/error-message-guidelines/
  - https://www.w3.org/WAI/ARIA/apg/patterns/alert/
  - https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html
  - https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html
  - https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
  - https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
  - https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html
  - https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
  - https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA21
  - https://developer.android.com/reference/android/view/accessibility/AccessibilityEvent
  - https://reactnative.dev/docs/accessibility
  - https://docs.expo.dev/versions/latest/sdk/filesystem.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 55. Error recovery interactions (retry, resume, restore)

When an action fails, keep the user's input and say in place what failed and why. Offer the single most useful next step (Retry, Resume, Restore draft, Undo) without losing context.

## Use when

- Submit failures from network or server errors, and interrupted photo uploads.
- Sessions expiring mid-form, and relaunch after a crash with an unsent draft.
- Accidental deletes that can be undone.

## Avoid when

- Auto-retrying non-idempotent writes without idempotency keys.
- Modal dialogs for minor recoverable errors (NN/g: match the error's impact).
- Generic 'Something went wrong', and auto-dismissing error toasts (APG alert).
- 'Undo' for effects that already left the system, such as a sent SMS (use confirmation instead).

## Web technique

- Show an inline error near its source with a Retry button.
- For forms, show an error summary plus field errors and never reset the fields (NN/g: preserve input).
- Persist drafts locally and offer 'Restore draft?' on return.
- Give undo snackbars an action button that does not vanish quickly.
- Enter with opacity and transform only; no shake animation.

## Native technique

- Show an inline error View with a Retry Pressable.
- Fire Haptics.notificationAsync(Error) once, when an action the user started fails.
- Persist drafts and pending uploads, and resume on AppState returning to foreground.
- expo-file-system (SDK 58) cannot resume an upload: File.createUploadTask gives uploadAsync and cancel only; pause and resume exist for DownloadTask.
- To resume from an offset, read chunks with FileHandle (offset, readBytes) and send them through a chunked or multipart upload protocol your server supports.

## Timing

- Show the error as soon as the failure is known. Auto-retry idempotent requests with exponential backoff and jitter, showing 'Retrying in 5 s' only for long waits.
- Undo windows are guidance: long enough for keyboard and screen-reader users, with no WCAG number verified.

## Accessibility

- A failure of the action the user took uses role=alert without moving focus or auto-dismissing (APG).
- On form submit, moving focus to an error summary is acceptable.
- WCAG 4.1.3 covers error existence. WCAG 3.3.4 (AA) requires reversible, checked or confirmed for legal, financial and data-deletion actions. WCAG 2.2.5 (AAA) keeps data after re-authenticating.
- WCAG 3.3.1 (A) requires the item in error to be identified and described in text; 3.3.3 (AA) requires known corrections to be suggested; 2.2.1 (A) requires a warning before a session time limit with at least 20 s to extend it.
- Mark fields aria-invalid='true' and link the message with aria-describedby.
- React Native: on Android give the error container accessibilityLiveRegion='assertive' instead of relying on AccessibilityInfo.announceForAccessibility; on iOS call announceForAccessibility once.
- Keep accessibilityRole='alert' and a Retry button with a clear accessibilityLabel.

## Reduced motion

- No shake or bounce: the error appears instantly with icon, text and color.
- The undo snackbar appears in place without sliding.

## Keyboard

- Retry, Undo and Restore are reachable with Tab and activate with Enter/Space.
- A dismissible non-critical notice may close with Escape.
- Focus is not stolen by alerts, and returns to the original control after a successful retry.

## Performance

- Use backoff with jitter to protect battery and the server, and cancel retries on unmount.
- Upload large photos over cellular in resumable chunks instead of restarting them.

## Primitives to reuse

- Web and native: TanStack Query (isError keeps variables, mutate(variables) retries, built-in query retry).
- Expensify OfflineWithFeedback, which shows dismissible errors per item.
- APG Alert pattern.

## Tests

- Automated, with a simulated 500 or timeout: input preserved; specific error text; Retry reuses the same idempotency key; one alert announcement and no focus jump.
- Automated: session expiry, then re-authentication, keeps the data (WCAG 2.2.5).
- Automated: an interrupted upload resumes from its offset.
- Visual QA: the error sits near its source, is not shown by red alone, and its Spanish copy fits.

## State integrity

- Show 'Not sent, Retry' until confirmed, and 'Retrying…' while retrying, never 'Sent'.
- Show 'Restored' or 'Undone' only after the server confirms the reversal.
- Undo must reverse server state, not only the UI.

## References

- https://www.nngroup.com/articles/error-message-guidelines/
- https://www.w3.org/WAI/ARIA/apg/patterns/alert/
- https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html
- https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates

## Not verified

- Whether accessibilityRole='alert' is announced automatically on either platform in React Native 0.88.
- The NN/g error-message guidance: preserve input, and match the error's impact.
- WCAG 3.3.4 as cited here: neither reader confirmed it against its Understanding page.
- Undo window lengths, which are guidance with no primary source.
