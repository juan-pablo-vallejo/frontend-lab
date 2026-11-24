---
number: 50
name: Offline synchronization (queued, syncing, synced, failed)
classes: [functional-feedback, error-prevention, comprehension]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://developers.google.com/open-health-stack/design/offline-sync-guideline
  - https://web.dev/articles/offline-ux-design-guidelines
  - https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
  - https://raw.githubusercontent.com/Expensify/App/main/contributingGuides/philosophies/OFFLINE.md
  - https://developer.apple.com/design/human-interface-guidelines/progress-indicators
  - https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
  - https://docs.expo.dev/versions/latest/sdk/background-task.md
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
  - https://reactnative.dev/docs/accessibilityinfo
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 50. Offline synchronization (queued, syncing, synced, failed)

Give every locally saved change a visible state (saved on device, sending, sent, failed) and show one global summary. Failures stay until resolved, and no change is ever dropped silently.

## Use when

- Field workers capturing data without coverage.
- Any write that may be queued.

## Avoid when

- Sync status on screens unaffected by sync (Open Health Stack: show it only when relevant).
- Timestamps on every datum.
- A spinning wheel for long initial syncs (use a percentage bar).
- A 'Syncing' state that flickers on every keystroke when online.

## Web technique

- Queue writes in IndexedDB through a service worker.
- Background Sync has Limited availability (MDN, not Baseline), so also flush on the online event and on visibilitychange.
- Show a status region with text and icon, a per-row state icon with text, and native <progress> for bulk or initial sync.
- Animate only transform:rotate on the sync icon.

## Native technique

- Keep a persisted local queue and flush on expo-network state changes and on AppState returning to foreground; show a status chip.
- Also register an expo-background-task (WorkManager on Android, BGTaskScheduler on iOS) that flushes the queue in the background. The system decides when it runs and requires network and enough battery, so keep the foreground flush and never promise a sync time.
- Fire Haptics.notificationAsync(Warning or Error) only when an item the user is looking at fails permanently, never on routine sync cycles.
- Give no success haptic.

## Timing

- Show 'Syncing' only after about 1 s, to avoid flicker.
- Show 'Synced' for 2–4 s, then collapse to 'Last synced 10:42'.
- Rotate the spinner about once a second, linear.
- These figures are guidance; the Open Health Stack guidelines give states and placement, not durations.

## Accessibility

- A global polite role=status such as '3 changes waiting to send'.
- A failure stays visible, with a polite announcement and a link to the item; use role=alert only when immediate action is required.
- Use <progress> or role=progressbar with a value (WCAG 4.1.3), and never color alone (web.dev).
- A sync icon rotating longer than 5 s beside other content falls under WCAG 2.2.2: stop the rotation after 5 s and keep 'Sending 3 of 12', or show a determinate bar.
- React Native: accessibilityRole='progressbar' with accessibilityValue; on Android accessibilityLiveRegion='polite'.
- On iOS announce only on completion or failure, with announceForAccessibilityWithOptions and queue:true so the announcement does not interrupt speech.

## Reduced motion

- The rotating sync icon becomes a static icon with text such as 'Sending 3 of 12'.
- The progress bar jumps between values without easing.

## Keyboard

- Not applicable to the passive indicator.
- Its 'Sync now', 'Retry' and 'View failed' controls are buttons (Enter/Space).
- The list of failed items is reachable with Tab.

## Performance

- Batch requests and use exponential backoff so the radio is not woken repeatedly, which drains battery.
- Aggregate progress instead of re-rendering the list per item.
- In a service worker, pass the sync promise to event.waitUntil.

## Primitives to reuse

- Web: MDN Background Sync (SyncManager.register, sync event).
- Native: expo-network, expo-background-task.
- Both: the Expensify OfflineWithFeedback / pendingAction pattern; Open Health Stack's four bar states (offline, syncing, synced, failed).

## Tests

- Automated: a record created offline shows 'Saved on this device'; after reconnecting it moves to sending, then sent.
- Automated: a server 4xx marks it failed with the reason and a Retry, while its data is kept.
- Automated: killing and relaunching the app keeps the queue; retrying creates no duplicates.
- Visual QA: the four states are distinguishable without color, and the Spanish labels fit.

## State integrity

- 'Saved on this device' may show right after the local write commits.
- 'Sent', 'Synced', 'Submitted' or a green check may not show until the server acknowledges.
- Never silently drop a failed item, and surface conflicts instead of overwriting.
- On web an IndexedDB queue is best-effort storage that the browser can evict, and Safari proactively evicts origins not used regularly. Request navigator.storage.persist(), keep the unsent count visible, and warn before sign-out or clearing data while the queue is non-empty.

## References

- https://developers.google.com/open-health-stack/design/offline-sync-guideline
- https://web.dev/articles/offline-ux-design-guidelines
- https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
- https://raw.githubusercontent.com/Expensify/App/main/contributingGuides/philosophies/OFFLINE.md
- https://developer.apple.com/design/human-interface-guidelines/progress-indicators

## Not verified

- Applying WCAG 2.2.2 to a rotating sync icon is a reading of the normative text and its Note 4 on loading animations; no W3C page names this case.
- The timing figures, which have no primary source.
