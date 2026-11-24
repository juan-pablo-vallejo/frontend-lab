---
number: 21
name: Touch and ripple feedback
classes: [functional-feedback]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://reactnative.dev/docs/pressable
  - https://docs.swmansion.com/react-native-gesture-handler/docs/components/pressable
  - https://developer.android.com/develop/ui/compose/touch-input/user-interactions/handling-interactions
  - https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html
  - https://developer.apple.com/design/human-interface-guidelines/buttons
  - https://www.w3.org/WAI/ARIA/apg/patterns/link/
  - https://raw.githubusercontent.com/material-components/material-web/main/tokens/versions/latest/sass/_md-sys-state.scss
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (2 corrections applied).
---

# 21. Touch and ripple feedback

Every pressable gives a visible pressed state within one frame of touch-down and activates on release. Use the platform form: ripple on Android, highlight or opacity on iOS, state layer on web.

## Use when

Every custom button, row, card, icon button or tappable cell, on all platforms. Apple HIG asks for a press state on every custom button, because without one the button can feel unresponsive.

## Avoid when

- A second custom ripple on top of a native control that already provides one.
- A radial ripple as the iOS press style.
- Letting the ripple delay the action, for example waiting for it to finish before navigating; that slows every repeated tap.

## Web technique

- Start with a native `<button>` or `<a>` and a `:active` / `[data-pressed]` background state layer: an overlay colour change through `opacity` on a pseudo-element, instant and cheap.
- A pointer-origin ripple is optional: set the pointer coordinates as CSS custom properties on `pointerdown` and animate a pseudo-element's `transform: scale()` and `opacity` with a CSS keyframe or the Web Animations API (Baseline widely available).
- Keep `:focus-visible` as a separate ring.
- Never animate `width`, `height`, `border-radius` growth or `box-shadow`.
- Material Web `md-ripple` exists, but MWC is in maintenance mode, so do not adopt it as a dependency.

## Native technique

- `Pressable` with `android_ripple {color, borderless, radius, foreground}` on Android, and `style={({pressed}) => ...}` (opacity or background) on iOS.
- Inside RNGH scroll views or swipeable rows, use the react-native-gesture-handler 3.x `Pressable` (a drop-in replacement with `android_ripple`; requires `GestureHandlerRootView`).
- Leave `unstable_pressDelay` unset. No haptic for ordinary taps.

## Timing

- The pressed state appears on press-in with no delay (NN/g 0.1 s).
- RNGH `Pressable` keeps pressed for at least 130 ms on quick taps, to match RN `Pressable`.
- Release fade-out takes 150 to 250 ms ease-out.
- Material 3 state-layer opacity tokens: hover 0.08, focus 0.10, pressed 0.10, dragged 0.16 (`md.sys.state` tokens v34.0.21 in material-web). The 12% pressed figure is outdated.

## Accessibility

- Use the native role (button or link). The pressed visual is not announced and needs no ARIA.
- A focus-visible indicator is required, separate from the press state.
- WCAG at stake: 2.5.2 Pointer Cancellation (activate on the up-event; sliding off before release cancels, which RN `Pressable` supports through `pressRetentionOffset`), 2.5.8 Target Size Minimum (24×24 CSS px or spacing; extend with `hitSlop` on native), 1.4.1.
- React Native: `role` or `accessibilityRole` button, and `accessibilityState {disabled}` with no ripple when disabled (Compose docs show ripples reflecting enabled state).

## Reduced motion

- Replace the expanding radial ripple with an instant state-layer colour or opacity change. Colour and opacity are not motion under WCAG 2.3.3, so the acknowledgement of the touch is kept.
- On native, keep the pressed style.

## Keyboard

- Buttons: Enter and Space activate (APG Button).
- Links: Enter only (APG Link); do not add Space to links.
- Keyboard activation shows the same pressed state; React Aria `usePress` handles Enter and Space and sets `data-pressed`.

## Performance

- An opacity or transform state layer is compositor-only.
- On Android the native ripple is drawn by `RippleDrawable`. The Compose docs note ripples run on the RenderThread, so they stay smooth while the UI thread is busy.
- In long lists, use `Pressable`'s style function rather than a per-row Reanimated shared value.
- Avoid `unstable_pressDelay`, which makes scrolling lists feel laggy.

## Primitives to reuse

- Web: React Aria `usePress` / `Button` (`data-pressed`; `onPress` unifies mouse, touch and keyboard).
- Native: RN `Pressable` (`android_ripple`, pressed style); RNGH `Pressable` 3.x in gesture-handler contexts.

## Tests

- `onPress` fires on release, not on press-in.
- `pointerdown`, then a move outside, then up does not fire.
- Disabled controls show no pressed state.
- Keyboard activation produces the pressed style.
- Visual QA: the ripple is clipped to the shape (unless borderless), meets contrast in both themes, lands under the finger, and nested pressables show no double ripple.

## State integrity

Not applicable to outcomes: the ripple acknowledges input only and must never be styled or timed to imply that the action succeeded.

## References

- https://reactnative.dev/docs/pressable
- https://docs.swmansion.com/react-native-gesture-handler/docs/components/pressable
- https://developer.android.com/develop/ui/compose/touch-input/user-interactions/handling-interactions
- https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html
- https://developer.apple.com/design/human-interface-guidelines/buttons
- https://www.w3.org/WAI/ARIA/apg/patterns/link/
- https://raw.githubusercontent.com/material-components/material-web/main/tokens/versions/latest/sass/_md-sys-state.scss

## Not verified

- The m3.material.io state-layer page was not opened; the opacity values come from the material-web token file v34.0.21, in a repository that is in maintenance mode.
- Whether Android `RippleDrawable` honours the system animation scale.
- Whether RN `android_ripple` inherits the RenderThread guarantee (the Compose docs state it for the framework `RippleDrawable`).
- That the Compose docs show ripples reflecting enabled state.
