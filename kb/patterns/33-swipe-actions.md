---
number: 33
name: Swipe actions
classes: [functional-feedback, error-prevention]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.nngroup.com/articles/contextual-swipe/
  - https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/
  - https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html
  - https://reactnative.dev/docs/accessibility
  - https://docs.expo.dev/versions/latest/sdk/haptics/
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (no corrections applied).
---

# 33. Swipe actions

Swipe is only a shortcut on native touch lists: one consistent action per direction, always duplicated by visible or menu controls, with undo for destructive results.

## Use when

Native mobile lists where field workers repeat one obvious row action (archive, mark done, delete) and the same action exists elsewhere. NN/g says users expect swipe to reveal destructive actions.

## Avoid when

- Desktop web.
- As the only route to an action (NN/g: hidden and rarely found).
- Lists that already use horizontal swipe for navigation or a carousel.
- Actions that change with the row's state.
- Irreversible actions without confirmation or undo.

## Web technique

1. A visible row action button or overflow menu (`<button>`, or a popover menu) is the primary path; WCAG 2.5.1 requires a single-pointer alternative to path-based swipes.
2. If touch web needs swipe, use Pointer Events with `touch-action: pan-y` and translate the row's `transform` only, revealing the actions behind it.
3. Add no library for desktop. Never animate the row's `left` or `width`.

## Native technique

- Gesture Handler `ReanimatedSwipeable` (RNGH 3.x docs; npm 3.5.0) with `renderRightActions` / `renderLeftActions` as real `Pressable` buttons, `rightThreshold`, `overshootFriction` ≥8 (the docs' native-feel suggestion) and `flexDirection` for RTL.
- Close other open rows on `onSwipeableWillOpen`.
- Add matching `accessibilityActions` on the row.
- Haptics: one `impactAsync(Light)` (Android `Gesture_End`) when the release threshold is crossed; `notificationAsync(Warning)` only if a full swipe commits a destructive action.

## Timing

The row tracks the finger 1:1 (friction 1). It snaps open or closed in about 150–250 ms with a critically damped spring and no bounce. A full-swipe commit collapses the row in 200–250 ms (see pattern 39).

## Accessibility

- Swipe is invisible to screen readers, so each swipe action must be an accessibility action (iOS Actions rotor, TalkBack actions): `accessibilityActions=[{name:'archive',label:'Archivar'}]` with `onAccessibilityAction`, plus a long-press or overflow menu.
- Revealed buttons need `accessibilityRole='button'` and labels; the result is announced politely.
- WCAG 2.5.1 (A), 2.5.7, 2.1.1, 4.1.3. The web equivalent is the visible button or a menu with `aria-haspopup`.

## Reduced motion

The row still follows the finger because the user drives it. On release it snaps open or closed without animation. A committed action removes the row instantly, with an undo snackbar and a status message stating what happened (Reanimated `ReduceMotion.System` jumps to the end values).

## Keyboard

Not applicable to the gesture itself. The equivalent actions must be reachable as buttons or menu items (Tab, Enter or Space; for a menu, the APG menu button pattern) and through platform keyboard access such as iOS Full Keyboard Access.

## Performance

Gesture and translation run on the UI thread with Reanimated, so the JS thread is not involved per frame. Do not render heavy action content for every row; render actions lazily from the progress value. With FlashList recycling, `reset()` a recycled row's swipe state.

## Primitives to reuse

- Native: Gesture Handler `ReanimatedSwipeable` (drop-in replacement for `Swipeable`); Reanimated.
- Web: native `<button>`, a popover-based menu, or React Aria `Menu` / `MenuTrigger`.

## Tests

- Automated: every swipe action is also exposed as an accessibility action and as a visible or menu control; firing the accessibility action calls the same handler; destructive actions produce an undo or confirmation; RTL mirrors the directions.
- Visual QA: the revealed action does not hide the row's identifying text (NN/g), colours and icons are consistent across lists, vertical scroll causes no accidental triggers, and the threshold haptic fires once.

## State integrity

The row may animate away at commit only if the action is reversible (undo) and the server response is awaited in the background. On failure, the row returns to its original position with an inline error. For irreversible actions, reveal then tap with confirmation; never use a full-swipe auto-commit.

## References

- https://www.nngroup.com/articles/contextual-swipe/
- https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/
- https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html
- https://reactnative.dev/docs/accessibility
- https://docs.expo.dev/versions/latest/sdk/haptics/

## Not verified

- Whether Android `Gesture_End` is the semantically right constant for a threshold crossing (the enum value exists; the mapping is a judgement).
