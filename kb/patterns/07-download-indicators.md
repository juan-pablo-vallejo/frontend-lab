---
number: 7
name: Download indicators
classes: [functional-feedback, perceived-performance]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a
  - https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams
  - https://docs.expo.dev/versions/latest/sdk/filesystem/
  - https://www.nngroup.com/articles/designing-for-waits-and-interruptions/
  - https://developer.apple.com/design/human-interface-guidelines/progress-indicators
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (3 corrections applied).
---

# 7. Download indicators

Let the browser or OS show download progress whenever it can. Build in-app progress only for authenticated or generated files, and report "Downloaded" only once the file exists.

## Use when

- Exporting reports, PDFs, or CSVs.
- Fetching offline packs, maps, or job documents on a phone.
- Any file transfer likely to take more than about 1 s, especially on mobile networks.

## Avoid when

- Small files that finish in under 1 s: button feedback is enough.
- On the web, duplicating the browser's own download UI for plain same-origin links.
- Byte progress for server-side report generation, where the wait is computation: show job status or steps instead.
- Blocking the screen while a download runs.

## Web technique

1. A plain `<a href download>` (same-origin, `blob:` or `data:` URLs) or a server `Content-Disposition: attachment`, so the browser's native download UI shows progress (Baseline widely available).
2. When the file needs auth headers or client assembly: `fetch`, then `response.body.getReader()`, summing `chunk.byteLength` against `Content-Length` to drive a `<progress>`. Fall back to indeterminate when `Content-Length` is missing or the response is compressed. Then create a `blob:` URL and click a download link.
3. For long server exports: an async job with a status row (queued, generating, ready) plus a completion notification.
4. Animate only `transform` or `opacity` on the indicator.

## Native technique

- expo-file-system (SDK 58) `File.createDownloadTask(url, destination, {onProgress})` yields `bytesWritten` and `totalBytes` (`totalBytes` is -1 when the size is unknown: go indeterminate).
- It supports `pause`, `pauseAsync` and `resumeAsync`, and `savable()` / `fromSavable()` persists a paused task, which suits flaky connectivity.
- `savable()` can be called only while the task is paused, so call `pauseAsync()` before persisting; a dropped connection rejects the promise instead.
- On iOS `sessionType` defaults to `'background'`: the transfer may continue while suspended, but the JS task, promise and callbacks are not restored after termination. On relaunch, reconcile by checking the destination file.
- Drive a bar or ring from `onProgress`, throttled.
- Haptic: `notificationAsync(Success)` once when a foreground, user-initiated download finishes; `(Error)` on failure. None for background downloads.

## Timing

- Indicator fade-in 100 to 150 ms.
- Fill tween 150 to 300 ms ease-out between throttled updates.
- Completion state change (icon swaps to "Open") under 200 ms, with no celebratory animation (heuristic within the NN/g 100 to 500 ms range).

## Accessibility

- The trigger is a link (download) or a button (generate).
- While running, expose a `role=progressbar` named after the file ("Downloading Route-12.pdf"), and update the trigger's accessible name or state rather than moving focus.
- Announce "Download complete" politely via `role=status`, and failures via `role=alert` with a Retry button.
- WCAG 4.1.3, 1.4.11. WCAG 2.2.2 applies only to an indeterminate animation that starts automatically, runs over 5 s and sits beside other content; one started by the user's own action is outside it.
- RN: `accessibilityRole='progressbar'` with `accessibilityValue`, `accessibilityState={{busy:true}}` on the row, and `AccessibilityInfo.announceForAccessibility` on completion or failure.

## Reduced motion

Same as progress bars: no fill tween and no indeterminate sweep. Show a static bar plus text ("3.2 of 10 MB", "Paused, waiting for network"). The completion state is conveyed by an icon and text change, not motion.

## Keyboard

- The trigger link or button activates with Enter (and Space for a button).
- Cancel, Pause and Resume buttons are tabbable, separate controls outside the progressbar.
- Focus stays on the row and is not stolen when the download completes.

## Performance

- Reading a stream for progress keeps the whole file in memory until the Blob is built; for very large exports prefer the native browser download.
- On mobile, downloads keep the radio active: batch them, resume rather than restart (`DownloadTask` `resumeAsync`), and throttle UI updates so the JS thread stays free.

## Primitives to reuse

- Web: native `<progress>` or React Aria `ProgressBar` for the in-app case; the browser's native download manager.
- Native: expo-file-system `DownloadTask`; `@expo/ui` `ProgressView` for the indicator.

## Tests

- Mock a stream with and without `Content-Length` and assert determinate against indeterminate rendering.
- Cancel aborts (`AbortController` or `task.cancel`) and removes partial files.
- "Downloaded" appears only after the write promise resolves with a file (see State integrity).
- The failure path shows Retry and announces it.
- Native: a paused task restored via `fromSavable` resumes from `bytesWritten`.
- Visual QA: row layout stable across states, offline and paused states legible, Spanish strings fit.

## State integrity

- Before completion, show only real bytes received or "Preparing…".
- Show "Downloaded / Open" only when `downloadAsync()` or `resumeAsync()` resolves with a `File` (`null` means paused) and `file.exists` is true; on web, once the Blob is built and saved. Rejection means failed or cancelled.
- Bytes equal to total is not enough.
- On interruption, show "Paused" or "Failed" with the real partial amount, never "Complete".

## References

- [MDN: the a element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a)
- [MDN: using readable streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [NN/g: designing for waits and interruptions](https://www.nngroup.com/articles/designing-for-waits-and-interruptions/)
- [Apple HIG: progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)
- [WCAG 2.2 Understanding 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

## Not verified

- Whether `DownloadTask.cancel()` deletes partial files, whether a task restored with `fromSavable` resumes from the previous byte offset (resume data is opaque and platform-specific), and how `downloadAsync()` behaves on non-2xx responses; none is documented on the Expo FileSystem page.
- The MDN "Using readable streams" article and the `Content-Length` against compressed-response caveat were not opened.
- The fill tween and fade timings have no primary source; only the NN/g figures were confirmed.
