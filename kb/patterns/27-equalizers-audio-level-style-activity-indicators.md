---
number: 27
name: Equalizers (audio-level style activity indicators)
classes: [decorative, functional-feedback]
tier: rarely-justified
status: researched
date: 2026-11-23
sources:
  - https://developer.apple.com/design/human-interface-guidelines/sf-symbols
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
  - https://developer.apple.com/design/human-interface-guidelines/motion
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/meter_role
  - https://reactnative.dev/docs/accessibility
  - https://reactnative.dev/docs/view
  - https://docs.expo.dev/versions/latest/sdk/audio/
  - https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
  - https://api.webstatus.dev/v1/features/web-audio
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 27. Equalizers (audio-level style activity indicators)

Use a moving level meter only when it reflects real audio input, such as a mic check while recording. Otherwise an equalizer is decoration: show a static 'Recording' or 'Playing' label.

## Use when

- A field worker recording a voice note, where a live mic level proves the microphone hears them.
- A 'now playing' marker on one row of a media list.

## Avoid when

- As a generic loading or activity spinner.
- With fake bars not tied to audio.
- In dense operational lists.
- Anywhere it loops more than 5 s beside other content without a pause control (WCAG 2.2.2).

## Web technique

- Prefer a static icon with text such as 'Recording 0:12'.
- For a live meter, draw levels from real audio by animating transform:scaleY on fixed-height bars or drawing one canvas; never animate height.
- AnalyserNode (Web Audio API, Baseline Widely available) gives real-time frequency and time-domain data from the microphone stream without altering it.
- Run requestAnimationFrame only while recording and stop it when the document is hidden.

## Native technique

- Enable isMeteringEnabled: true in the useAudioRecorder options.
- Read RecorderState.metering through useAudioRecorderState(recorder, interval) with a shorter interval than the 500 ms default, or poll recorder.getStatus().
- Feed the value into Reanimated shared values with withTiming smoothing and animate transform scaleY on the UI thread.
- Metering units are not documented.
- iOS idiom: SF Symbols variable color.
- No haptic.

## Timing

- Follow real input at display rate with light smoothing (roughly a 50–100 ms decay).
- A fake loop is not recommended at any speed.
- These figures are guidance, not sourced.

## Accessibility

- Hide the bars from assistive technology: aria-hidden on web.
- On React Native set both importantForAccessibility='no-hide-descendants' (Android) and accessibilityElementsHidden (iOS), or use the View aria-hidden prop.
- Expose state as text, and announce recording start and stop once through a polite status; never announce levels.
- 'No sound detected' may go out as a polite status.
- WCAG 2.2.2 applies if the meter runs beside other content.

## Reduced motion

- Bars become a static icon plus a text state ('Sound detected' or 'No sound').
- Or a single static level bar updated at a low rate.
- The elapsed-time text remains.

## Keyboard

- Not applicable to the visual.
- The record or play control is an APG button: Enter and Space.

## Performance

- Continuous per-frame work drains battery.
- Keep it on the UI thread with Reanimated shared values (no React state per frame), and use only transform.
- Stop when the screen loses focus or recording ends.

## Primitives to reuse

- iOS: SF Symbols variable color, pulse and breathe animations (HIG).
- Web: native <meter> for a single level.
- Native: Reanimated for UI-thread drawing.

## Tests

- Automated: bars are hidden from assistive technology; recording status text exists.
- Automated: the animation loop stops on stop, blur or hidden tab; nothing moves under reduce motion.
- Visual QA: the meter visibly differs between silence and speech, without jank on low-end Android.

## State integrity

- Show 'Recording' only while the recorder is actually capturing.
- Whether the clip is saved or uploaded is a separate state (pattern 50) and must not be implied by the meter stopping.

## References

- https://developer.apple.com/design/human-interface-guidelines/sf-symbols
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/meter_role

## Not verified

- expo-audio metering units and the useAudioStream buffer format; useAudioStream (real-time PCM microphone capture) exists in SDK 58 but was not read in detail.
- The 50–100 ms smoothing figure, which is guidance with no primary source.
