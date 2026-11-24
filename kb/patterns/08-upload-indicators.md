---
number: 8
name: Upload indicators
classes: [functional-feedback, error-prevention, perceived-performance]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload
  - https://docs.expo.dev/versions/latest/sdk/filesystem/
  - https://docs.expo.dev/versions/latest/sdk/haptics/
  - https://developer.apple.com/design/human-interface-guidelines/playing-haptics
  - https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - https://api.webstatus.dev/v1/features/fetch-request-streams
  - https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
  - https://react-aria.adobe.com/llms.txt
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (6 corrections applied).
---

# 8. Upload indicators

Show per-file determinate progress, then a distinct "processing" state, and mark a file uploaded only after the server confirms it. Never discard the local copy before that.

## Use when

- Photo, signature, or document capture on a phone; attachments on office forms; bulk imports.
- Most valuable on slow or unreliable mobile networks, where transfers take seconds to minutes.

## Avoid when

- Tiny payloads under about 1 s: inline button feedback is enough.
- Blocking the form or screen during upload. Let the user keep filling fields or capture the next photo; a modal upload slows a repeated capture flow.
- An indeterminate spinner when bytes can be measured.

## Web technique

1. `XMLHttpRequest` with `xhr.upload` `progress` events (`loaded`/`total` when `lengthComputable`; Baseline widely available). Register listeners before `send()`; cross-origin, they force a CORS preflight.
2. Do not rely on `fetch()` streaming request bodies for progress: Chromium-only as of November 2026.
3. Per-file row: name, size, `<progress>`, Cancel/Retry; the fill animates via `transform: scaleX`. Show local thumbnail previews immediately (object URLs) labelled "Not uploaded yet".
4. No library needed. For resumable large files, tus-js-client (4.3.1, MIT, published September 2026) is maintained.

## Native technique

- expo-file-system (SDK 58) `file.createUploadTask(url, {onProgress})` gives `bytesSent` and `totalBytes`, `uploadAsync()` and `cancel()`; no pause or resume.
- `file.upload(url, options)` also accepts `onProgress` and `signal`.
- Multipart progress includes framing overhead, so clamp to 100%.
- iOS `sessionType` defaults to `'background'`: the upload continues while suspended, but the JS task is not restored after termination.
- Persist a retry queue for offline uploads.
- Haptic: `notificationAsync(Success)` when the server confirms a foreground single upload, `(Error)` on failure. One haptic per batch, not per file (Apple: avoid overusing haptics).

## Timing

- Fill tween 150 to 300 ms ease-out on throttled updates.
- State transitions (uploading, processing, uploaded or failed): 100 to 200 ms crossfade on `opacity`.
- No celebratory animation on success in operational flows.

## Accessibility

- Each file row: a `role=progressbar` named for the file with `aria-valuenow`, or `aria-valuetext` ("Photo 2 of 5, 40%"). The container is a list.
- Announce batch completion via `role=status` (polite) and each failure via `role=alert`, with a focusable Retry. Do not move focus on completion.
- WCAG 3.3.1 applies when a file is rejected as input (type, size): identify the file and describe the error in text. A network failure is a 4.1.3 status message.
- WCAG 1.4.11. WCAG 2.2.2 applies only to an animation that starts automatically, runs over 5 s and sits beside other content; one started by the user's own action is outside it.
- RN: `accessibilityRole='progressbar'`, `accessibilityValue` `{min,max,now}` or `{text}`, and `announceForAccessibilityWithOptions({queue:true})` on iOS so announcements do not cut off speech.

## Reduced motion

No fill tween or sweep. A static bar plus numeric text ("1.2 / 4.8 MB") and an explicit state label ("Processing on server", "Waiting for connection") replace the sense of motion.

## Keyboard

- The trigger is a native `<input type=file>` or a button (Enter/Space).
- Per-file Cancel, Retry and Remove are buttons reachable by Tab.
- After removing a row, move focus to the next row or the list heading.

## Performance

- Coalesce progress events to `requestAnimationFrame` or a few Hz.
- Compress or resize images on the device before upload to cut transfer time and battery.
- Update only the row on each progress event, not the whole list.
- Uploads must survive app backgrounding: see the iOS `sessionType` note under Native technique.

## Primitives to reuse

- Web: native `<input type=file>`, `<progress>`, React Aria `ProgressBar`, `FileTrigger` and `DropZone` (both generally available).
- Native: expo-file-system `UploadTask` with `@expo/ui` `ProgressView` (iOS), `LinearProgressIndicator` (Android) or a custom bar.

## Tests

- Progress is monotonic and clamped at 100.
- After bytes reach 100% the UI shows "Processing" (not "Uploaded") until a mocked 2xx arrives.
- On a 4xx/5xx or network error the row shows Failed with Retry and the local file is retained.
- Cancel calls abort or cancel, and the server request is not counted as success.
- Offline queuing persists across reload.
- Visual QA: thumbnails clearly marked pending or uploaded, failed rows distinct beyond colour (icon plus text), Spanish labels fit.

## State integrity

- May show before confirmation: a local preview marked pending, real bytes sent, and a "Processing" state after transfer.
- May not show before confirmation: "Uploaded" or a check mark, deletion of the local or offline copy, the attachment counted in record totals, or navigation implying it was saved.
- With expo-file-system, `uploadAsync()` and `file.upload()` resolve for every completed HTTP response, including 4xx and 5xx. Mark a file "Uploaded" only when `result.status` is 2xx (and the body confirms, if the API returns an id); treat any other status as Failed with Retry and keep the local copy.
- Optimistic attachment rows carry a pending badge and roll back to Failed with Retry, never silently disappear.

## References

- [MDN: XMLHttpRequest upload](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload)
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [Apple HIG: playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- [WCAG 2.2 Understanding 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [Web platform status: fetch request streams](https://api.webstatus.dev/v1/features/fetch-request-streams)
- [WCAG 2.2 Understanding 3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)
- [React Aria docs index](https://react-aria.adobe.com/llms.txt)
- [WCAG 2.2 Understanding 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

## Not verified

- The fill tween and crossfade timings have no primary source; only the NN/g figures were confirmed.
