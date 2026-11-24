---
number: 56
name: Contextual haptic feedback
classes: [functional-feedback, error-prevention]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://docs.expo.dev/versions/latest/sdk/haptics/
  - https://developer.apple.com/design/human-interface-guidelines/playing-haptics
  - https://developer.android.com/develop/ui/views/haptics/haptics-principles
  - https://reactnative.dev/docs/accessibilityinfo
  - https://developer.apple.com/design/human-interface-guidelines/feedback
  - https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-worklets/docs/threading/scheduleOnRN.mdx
  - https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-worklets/docs/threading/runOnJS.mdx
  - https://developer.apple.com/tutorials/data/design/human-interface-guidelines/playing-haptics.json
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (2 corrections applied).
---

# 56. Contextual haptic feedback

Use system haptic types for their documented meaning, synced with a visible change. Reserve notification haptics for confirmed outcomes, never as the only channel, and let users turn haptics off.

## Use when

Native field use where eyes are elsewhere: a confirmed scan or submission (success), a rejected action or validation failure (error), a long-press activation, a snap or threshold crossing in a drag, or toggles that lack system haptics.

## Avoid when

- The web: the Vibration API has limited availability.
- Every tap, list scrolling or background events.
- High-frequency repeated actions where a buzz on every repetition becomes noise (Android: frequent events must be very subtle; Apple: avoid overuse).
- Camera or dictation use (iOS suppresses haptics then).
- A buzzy or long vibration for touch feedback (Android: choose no haptics over buzzy ones).

## Web technique

Not applicable as a primary technique: the Web Vibration API has limited support (webstatus.dev), and expo-haptics on web depends on it. Convey the same information visually and through `role=status` or `role=alert`.

## Native technique

- expo-haptics (SDK 58, 58.0.8).
- `notificationAsync(Success/Warning/Error)` for confirmed outcomes; `selectionAsync()` for value changes in pickers or segmented controls; `impactAsync(Light…Heavy, Rigid, Soft)` for physical snaps or collisions.
- On Android prefer `performAndroidHapticsAsync(Confirm, Reject, Long_Press, Toggle_On, Toggle_Off, Segment_Tick)`, which needs no `VIBRATE` permission.
- Fire in the same frame as the visual change, and add an in-app setting to disable haptics.

## Timing

- Haptics are transient: a good key-click is 10 to 20 ms (Android), and the actuator may ring 20 to 50 ms more.
- Fire at the moment of the visual state change: selection on value change, success or error on server response, long-press at the `delayLongPress` threshold (500 ms default in RN `Pressable`).
- In most apps prefer short haptics that complement discrete events; long-running haptics dilute the meaning of the feedback and distract from the task (Apple).

## Accessibility

- Haptics supplement, never replace, visual text and announcements. Apple asks that the app stay usable without them, and feedback through colour, text, sound and haptics reaches more people.
- Pair every outcome haptic with a `role=status` or `role=alert` equivalent, using `AccessibilityInfo.announceForAccessibility` on native.
- WCAG at stake: 4.1.3 for the paired message, 1.4.1 for the paired visual.
- There is no ARIA or RN accessibility role for haptics.

## Reduced motion

- Reduce Motion does not govern haptics, so keep them.
- The OS haptics or system-feedback setting, iOS Low Power Mode, and an in-app toggle can disable them.
- Haptics may silently not play (the Taptic Engine does nothing in Low Power Mode), so the visual and spoken channels always carry the full message.

## Keyboard

Not applicable: haptics are an output channel. The triggering controls follow their own APG keyboard patterns.

## Performance

- Calls are asynchronous and cheap, but each one costs battery.
- For drag thresholds, trigger once per crossing from a worklet with `scheduleOnRN(fn, ...args)` imported from react-native-worklets; do not use the deprecated `runOnJS`.
- Do not fire inside scroll handlers, per-frame callbacks or loops.
- Debounce rapid repeats such as batch scanning.

## Primitives to reuse

- expo-haptics (`impactAsync`, `notificationAsync`, `selectionAsync`, `performAndroidHapticsAsync`).
- System controls (switches, sliders, pickers) already play Apple haptics on iPhone, so do not double up.

## Tests

- Mock expo-haptics and assert the call type and that it fires once per event: Success only after a mocked 2xx, Error on failure, none on plain taps or scroll, none when the in-app setting is off.
- A paired visual or announcement exists for every haptic call.
- Device QA: the haptic is in sync with the animation, not buzzy on low-end Android, absent in Low Power Mode without breaking the flow, and tolerable over a full shift of repeated actions.

## State integrity

- You may fire an input-acknowledgement haptic (selection, light impact) on press.
- Do not fire a Success notification haptic until the system confirms the result: an unconfirmed success buzz in the field is worse than none.
- Fire Error when a failure is known, and never pair a success haptic with an optimistic update that may later revert.

## References

- https://docs.expo.dev/versions/latest/sdk/haptics/
- https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- https://developer.android.com/develop/ui/views/haptics/haptics-principles
- https://reactnative.dev/docs/accessibilityinfo
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-worklets/docs/threading/scheduleOnRN.mdx
- https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-worklets/docs/threading/runOnJS.mdx
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/playing-haptics.json

## Not verified

- Whether RN `Switch` inherits UISwitch system haptics.
- Whether `performAndroidHapticsAsync` respects the Android system touch-feedback setting.
