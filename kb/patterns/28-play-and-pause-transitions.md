---
number: 28
name: Play and pause transitions
classes: [functional-feedback, comprehension]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
  - https://docs.expo.dev/versions/latest/sdk/video/
  - https://www.w3.org/WAI/ARIA/apg/patterns/button/
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
  - https://www.media-chrome.org/docs/en/components/media-play-button
  - https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play_event
  - https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playing_event
  - https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html
  - https://docs.expo.dev/versions/v58.0.0/sdk/audio/
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (3 corrections applied).
---

# 28. Play and pause transitions

The play/pause control reflects the actual media state, switching icon and accessible label only when playback really starts or stops, with a brief crossfade at most.

## Use when

Products with audio or video: voice notes, recorded calls, training videos, field inspection clips.

## Avoid when

- Morphing or animating icons in dense lists of many voice notes, where an instant swap is clearer.
- An auto-playing preview without a pause control (WCAG 2.2.2 for moving content over 5 s).

## Web technique

- Use the native `<video controls>` or `<audio controls>` first.
- For custom controls, use a `<button>` whose label and icon follow the `playing`, `pause` and `waiting` events, not `play` (which fires as soon as `paused` flips).
- Show "Pause" only when `await media.play()` resolves or `playing` fires; revert on rejection.
- Crossfade the two SVG icons with `opacity` and `transform: scale` only. View Transitions (Baseline newly available since 2025-10-14) is unnecessary here.
- Media Chrome `<media-play-button>` (media-chrome 4.19.5) is a maintained reference with play and pause slots.

## Native technique

- Audio: expo-audio (SDK 58) `useAudioPlayer` plus `useAudioPlayerStatus(player)`; icon from `status.playing`, buffering indicator from `status.isBuffering`.
- Video: expo-video `VideoView` with `nativeControls` first. Custom controls follow `useEvent(player, 'playingChange')` and `statusChange` `'loading'`.
- Reanimated crossfade with `ReduceMotion.System`.
- No haptic: the media itself is the feedback.

## Timing

- Icon crossfade or morph of 100 to 200 ms ease-out (NN/g small-feedback range).
- If `play()` has not resolved within about 1 s, show a buffering indicator in the button (NN/g 1 s limit).

## Accessibility

- A button whose label changes "Play"/"Pause" ("Reproducir"/"Pausar"), with no `aria-pressed`, which APG says is unnecessary when the label changes. Alternatively, a constant label with `aria-pressed`.
- Focus stays on the button.
- Some screen readers may not re-announce a label change on the focused element, so test with VoiceOver and TalkBack.
- WCAG at stake: 1.4.2 Audio Control (audio that auto-plays over 3 s needs pause/stop or independent volume control), 2.2.2 Pause, Stop, Hide (auto-starting moving content over 5 s shown alongside other content), 4.1.2, 2.5.8.
- React Native: `accessibilityRole` button with a changing `accessibilityLabel`, or togglebutton with `accessibilityState {checked}`.

## Reduced motion

Instant icon swap or opacity-only crossfade, with no scale or morph. The label and icon still show the state, so nothing is lost. Do not auto-play media under reduced motion.

## Keyboard

- Enter and Space on the focused button (APG Button).
- Native `<video controls>` provides its own keys.
- Global single-key media shortcuts (for example K) are a player convention, not a requirement, and must not conflict with form typing.

## Performance

- Opacity and transform icon swaps are compositor-only.
- Do not re-render the media element on state change.
- In lists, mount a player only for the active item and release it through the expo-video `useVideoPlayer` automatic cleanup on unmount, to save battery and memory on field devices.

## Primitives to reuse

- Web: native media controls; Media Chrome `media-play-button`.
- Native: expo-video `VideoView` `nativeControls`, `useVideoPlayer` plus `useEvent`; expo-audio `useAudioPlayer` plus `useAudioPlayerStatus` for audio.

## Tests

- The label is "Pause" only after a mocked `play()` resolves.
- It reverts to "Play" on a `NotAllowedError` rejection.
- Enter and Space toggle.
- Only one item in a list plays at a time.
- No autoplay under reduced motion.
- Visual QA: the icon matches the state after rapid toggling, the buffering state is visible, and the hit target is at least 24 px (44 or 48 pt on touch recommended).

## State integrity

- On tap you may show a loading or buffering state immediately.
- Show "Pause" (playing) only after `play()` resolves (web) or `playingChange` reports `isPlaying` (expo-video).
- On rejection or an error status, revert to "Play" and show a reason.

## References

- https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play_event
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playing_event
- https://docs.expo.dev/versions/latest/sdk/video/
- https://docs.expo.dev/versions/v58.0.0/sdk/audio/
- https://www.w3.org/WAI/ARIA/apg/patterns/button/
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html
- https://www.media-chrome.org/docs/en/components/media-play-button

## Not verified

- Whether screen readers re-announce a label change on the focused play/pause button.
- The K shortcut convention.
- The accessible-label behaviour of Media Chrome `media-play-button` (its slots and maintenance status were confirmed).
