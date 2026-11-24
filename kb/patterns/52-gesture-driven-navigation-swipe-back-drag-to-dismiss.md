---
number: 52
name: Gesture-driven navigation (swipe back, drag to dismiss)
classes: [navigation, functional-feedback, error-prevention]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://reactnavigation.org/docs/native-stack-navigator
  - https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture
  - https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
  - https://www.nngroup.com/articles/bottom-sheet/
  - https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-pan-gesture
  - https://docs.expo.dev/versions/latest/config/app/
  - https://docs.expo.dev/router/advanced/prevent-screen-removal.md
  - https://docs.expo.dev/router/migrate/sdk-57-to-58.md
  - https://unpkg.com/expo-router@58.0.32/build/react-navigation/core/usePreventRemove.d.ts
  - https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md
  - https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/
  - https://docs.expo.dev/router/advanced/stack.md
  - https://docs.expo.dev/router/migrate/sdk-55-to-56.md
  - https://unpkg.com/expo@58.0.26/bundledNativeModules.json
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (4 corrections applied).
---

# 52. Gesture-driven navigation (swipe back, drag to dismiss)

Keep the platform's own back gestures and let interactive dismissals track the finger. Always
provide a visible Back or Close button, and never let a swipe silently discard unsaved work.

## Use when

Native stack navigation (iOS edge swipe, Android predictive back) and sheets or modals users
dismiss repeatedly. Field workers using a phone one-handed benefit from fast, interruptible,
finger-tracking dismissal.

## Avoid when

- Custom swipe gestures on the web: browsers own back swipes.
- Gestures that conflict with horizontal lists or maps.
- Swipe as the only way out (NN/g on bottom sheets; Apple HIG: shortcut gestures supplement a
  Back button).
- Intercepting back for logging: it disables Android's predictive-back animation.

## Web technique

- Do not implement swipe-back; rely on browser history and real links.
- Dismissible panels: `<dialog>` or popover with a Close button and Escape.
- Drag-to-dismiss on touch is optional: pointer events with `touch-action` set and
  `transform: translateY` following the pointer, then a transition to close or back.
- Vaul's README says the library is unmaintained, so don't adopt it.
- Animate only transform and opacity; never top, height or margin.

## Native technique

- In Expo Router apps set these on the Expo Router Stack: `gestureEnabled` (iOS only,
  default true), optional `fullScreenGestureEnabled`, `presentation: 'formSheet'` with
  `sheetAllowedDetents`. Do not import `@react-navigation/native-stack` in app code.
- Android predictive back is opt-in in Expo: set `android.predictiveBackGestureEnabled: true`
  in the app config (default false; Android 13+). Once opted in, Android 15+ plays the system
  back-to-home, cross-task and cross-activity animations. Test that the navigation stack
  still handles back correctly after enabling it.
- Custom gestures: Gesture Handler 3 (SDK 58 pins ~3.3.0) `usePanGesture` with
  `activeOffsetX`/`failOffsetY`, driving Reanimated on the UI thread.
- Haptics: none for system back. For custom drag-to-dismiss, at most one
  `Haptics.selectionAsync()` as the release threshold is crossed (optional; Apple warns
  against overuse).

## Timing

- While dragging, track the finger 1:1 with no easing.
- On release use a velocity-aware spring. Material slow spatial (damping ratio 0.9,
  stiffness 300; default spatial 0.9/700 for sheets) converts to Reanimated `withSpring` as
  damping = 2 x ratio x sqrt(stiffness x mass): `{mass: 1, stiffness: 300, damping: 31}` or
  `{mass: 1, stiffness: 700, damping: 48}`, plus the gesture velocity. Never pass
  `damping: 0.9`.
- Snap-back on cancel takes about 150-250ms. The gesture is interruptible at any time.

## Accessibility

- Every gesture needs a single-pointer, non-path alternative: a visible Back or Close button
  (WCAG 2.5.1, 2.5.7; user-agent and OS gestures are exempt, author gestures are not).
- Dialog sheets: `role=dialog`, focus in on open, Escape closes, focus returns to the
  trigger.
- RN: a Close button with `accessibilityRole="button"`, `accessibilityViewIsModal` on modal
  sheets (iOS), `onAccessibilityEscape` for the VoiceOver two-finger Z, and Android hardware
  back through the navigation stack.

## Reduced motion

Finger tracking during the user's own drag stays: it is direct manipulation. Release
animations become instant or a short crossfade (Reanimated's System default jumps to the end
value). The destination screen title and returned focus convey that navigation happened. On
iOS, `AccessibilityInfo.prefersCrossFadeTransitions()` signals a preference for crossfades.

## Keyboard

Escape closes dialogs and sheets (APG dialog). Browser back is Alt+Left or Cmd+[. Tab reaches
the visible Close or Back button, and Enter or Space activates it. On Android, the hardware
or gesture Back pops exactly one level.

## Performance

Run gesture callbacks and animations on the UI thread (Gesture Handler with Reanimated;
`runOnJS` defaults to false) so dragging never waits on JS. Native-stack gestures avoid JS
entirely. Watch for gesture conflicts with nested `ScrollView`s. On the web, non-passive
touch listeners block scrolling.

## Primitives to reuse

- Native: the native-stack options (`gestureEnabled`, `formSheet`, `gestureCancel` event),
  set on the Expo Router Stack in Expo Router apps; Android
  predictive back (`OnBackPressedCallback` / `PredictiveBackHandler`), Gesture Handler 3,
  Reanimated.
- Web: native `<dialog>`, Popover API, Radix Dialog.

## Tests

- A visible Back or Close exists and works with tap, Enter and Escape.
- Swipe-dismiss on a dirty form prompts instead of discarding.
- Android back pops one level, and no stray callback disables predictive back.
- Focus returns to the trigger.
- Visual QA: the sheet tracks the finger without lag, a cancelled swipe snaps back cleanly,
  and there is no conflict with horizontal carousels inside.

## State integrity

A swipe-dismiss is navigation, not save or cancel. If the screen holds unsaved or unsynced
input, use `usePreventRemove(isDirty, ({ repeat }) => ...)` imported from `expo-router`
(SDK 58+): confirm, set `isDirty` false, then call `repeat()`. Optionally also set
`gestureEnabled` false (iOS only). Never show "Saved" on dismiss without server
confirmation. Only plain React Navigation 7 apps use `navigation.dispatch(data.action)`.

## References

- https://reactnavigation.org/docs/native-stack-navigator
- https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture
- https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- https://www.nngroup.com/articles/bottom-sheet/
- https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-pan-gesture

## Not verified

- Material slow spatial spring 0.9/300: confirmed from Material Components Android docs and
  androidx tokens, not from the Material 3 site. The 0.8 figure some sources give is the
  Expressive scheme (0.8/200).
- Whether `expo-router` `usePreventRemove` intercepts the iOS swipe-down on formSheet or
  modal screens and the Android predictive-back gesture: the Expo doc only says it runs when
  navigation tries to remove the screen.
- Whether enabling `android.predictiveBackGestureEnabled` changes React Native `BackHandler`
  or Expo Router back handling.
