---
number: 43
name: Optimistic updates and rollback feedback
classes: [perceived-performance, functional-feedback, error-prevention]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://react.dev/reference/react/useOptimistic
  - https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
  - https://raw.githubusercontent.com/Expensify/App/main/contributingGuides/philosophies/OFFLINE.md
  - https://www.nngroup.com/articles/response-times-3-important-limits/
  - https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html
  - https://developer.android.com/reference/android/view/View
  - https://raw.githubusercontent.com/facebook/react-native/main/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/accessibilityinfo/AccessibilityInfoModule.kt
  - https://reactnative.dev/docs/accessibilityinfo
  - https://api.webstatus.dev/v1/features/view-transitions
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 43. Optimistic updates and rollback feedback

Apply predictable, low-risk changes instantly with a subtle pending marker. On failure, restore the prior state in place, say why, offer Retry, and never fake confirmation of financial, legal or irreversible actions.

## Use when

- High-frequency actions in dense operational screens where waiting slows repeated work: toggles, status changes, assignment, reordering, adding notes, mark as read.

## Avoid when

- Payments.
- Submissions that need server validation.
- Results the client cannot predict (server IDs, prices).
- Deletes with no undo.
- Legal or financial commitments (WCAG 3.3.4). Expensify's guide warns against letting users believe a financial transaction happened when it has not.

## Web technique

- Use React 19 useOptimistic inside an Action or startTransition, with a reducer that adds pending:true.
- Or TanStack Query: onMutate cancels queries and snapshots, onError restores the snapshot, onSettled invalidates.
- Mark pending items with reduced opacity or inline 'Saving…' text. Expensify uses 0.5 opacity, plus strikethrough for pending deletes.
- Animate only opacity and background-color.
- If items reorder, use transform-based FLIP. View Transitions are Baseline Newly available since 14 October 2025 (Firefox was last), not yet Widely available, so feature-detect and fall back to an instant reorder or transform-based FLIP.

## Native technique

- The same state logic applies, since TanStack Query works in React Native; pending opacity via Reanimated.
- Fire Haptics.notificationAsync(Error) once, when the rollback is shown for an action the user started.
- No success haptic on routine actions: HIG says avoid overuse.

## Timing

- The visual change must start within 0.1 s of input (NN/g).
- Show a pending marker only if confirmation takes longer than about 1 s, so fast saves do not flicker (Expensify shows pending styling only when offline).
- A rollback highlight of 200–400 ms with an ease-out is guidance.
- The error stays until dismissed.

## Accessibility

- The control's own state (aria-pressed, aria-checked) is the success feedback, so add no extra success announcement.
- On rollback, send a polite role=status, or role=alert if the user must act, such as 'Couldn't assign job 1042. Back to Unassigned.', without moving focus (WCAG 4.1.3) and without auto-dismissing (APG alert).
- React Native: update accessibilityState and set busy:true while pending.
- On rollback, Android: render the error text in a view with accessibilityLiveRegion ('polite', or 'assertive' when the user must act). iOS: AccessibilityInfo.announceForAccessibility, which interrupts current speech by default.

## Reduced motion

- No highlight sweep or reorder motion; the restored item switches instantly.
- A static error icon and text on the row carry the information.

## Keyboard

- The trigger control's own keys: Space for checkbox or switch, Enter/Space for button.
- After rollback focus stays on the control, and the Retry button is reachable with Tab.

## Performance

- Update the single cached item, not the whole list.
- Cancel in-flight queries so a refetch does not overwrite the optimistic value.
- Give temporary FlatList and list items stable keys (client ID or submittedAt, as TanStack suggests).

## Primitives to reuse

- Web: React useOptimistic; TanStack Query optimistic updates (via variables in the UI, or via the cache).
- Web and native, as a reference: the Expensify OfflineWithFeedback component with its pendingAction pattern.

## Tests

- Automated, with a mocked failure: the value reverts, the error is shown and announced once, and Retry re-sends the same variables.
- Automated: concurrent mutations do not clobber each other.
- Automated, with a mocked fast success: no pending flicker.
- Visual QA: the pending style is distinct but calm, and the rollback is visible in place.

## State integrity

- May show before confirmation: the new value marked pending, and local items greyed out.
- May not show: 'Saved' or success toasts, a success haptic, server-generated IDs or totals, or permanent removal of a deleted item.
- Rollback restores the server value, then refetches.

## References

- https://react.dev/reference/react/useOptimistic
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- https://raw.githubusercontent.com/Expensify/App/main/contributingGuides/philosophies/OFFLINE.md
- https://www.nngroup.com/articles/response-times-3-important-limits/
- https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html

## Not verified

- WCAG 3.3.4 as cited here: neither reader confirmed it against its Understanding page.
- The 200–400 ms rollback highlight, which is guidance with no primary source.
