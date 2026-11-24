---
number: 1
name: Animated toggles (switches)
classes: [functional-feedback, comprehension]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/switch/
  - https://www.nngroup.com/articles/toggle-switch-guidelines/
  - https://developer.apple.com/design/human-interface-guidelines/toggles
  - https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md
  - https://www.radix-ui.com/primitives/docs/components/switch
  - https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-reanimated/docs/animations/withSpring.mdx
  - https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal.md
  - https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/switch.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 1. Animated toggles (switches)

Use a switch only for a binary setting that takes effect immediately. The thumb moves and the colour changes to show the new state, and a visible result must confirm it worked.

## Use when

- Settings rows (notifications on, offline mode, show archived) where flipping applies the change at once, with no Save button (NN/g).
- On iOS, use the switch style only inside a list row (HIG).

## Avoid when

- Inside forms that need Submit or Save: use a checkbox.
- More than two states, or a mixed state.
- Triggering actions or navigation.
- Where the label would have to change with the state.
- HIG: do not replace an existing checkbox with a switch on macOS; outside a list on iOS, a toggle button fits better.

## Web technique

1. Native `<input type="checkbox" role="switch">` with a `<label>`. The `switch` attribute works only in Safari 17.4+; Chrome and Firefox do not support it (MDN BCD), so treat it as progressive enhancement only.
2. Draw track and thumb with CSS (`appearance: none`), or use Radix Switch or React Aria Switch.
3. Move the thumb with `transform: translateX()`; change the track with `background-color` and `border-color`. Never animate `left`, `margin` or `width`. `@starting-style` is not needed.

## Native technique

- Core `<Switch>` wraps the platform control: controlled through `value`/`onValueChange`, styled with `trackColor`/`thumbColor`. HIG says system switches play haptics automatically on supported iPhones.
- Custom switch: `Pressable` plus Reanimated `withSpring` on `translateX`. Fire `Haptics.performAndroidHapticsAsync(Toggle_On/Toggle_Off)` on Android or `Haptics.selectionAsync` on iOS when the value commits, not on press-in.
- Expo UI universal Switch: `import { Host, Switch } from '@expo/ui'`, rendered inside `<Host>` (for example `<Host matchContents>`). Props: `value`, `onValueChange`, `label`, `disabled`, `modifiers`, `testID`. The SDK 58 docs give no stability label. The same `Host` rule applies to the universal Checkbox, Slider and TextInput.

## Timing

- Thumb: 100–200 ms with `cubic-bezier(0.2,0,0,1)`.
- Material's fast spatial spring (damping ratio 0.9, stiffness 1400) is an Android token. In Reanimated use `withTiming`, or `withSpring({duration, dampingRatio: 1})`. Never pass 0.9 as `damping`: that is a physical coefficient (defaults: damping 120, stiffness 900, mass 4).
- Colour: 50–100 ms.
- No overshoot in operational UI.

## Accessibility

- `role=switch` (or native checkbox plus `role=switch`) with `aria-checked` true/false (native `checked` on the input).
- The label does not change with state (APG). Group switches with `fieldset`/`legend`, or `role=group` plus `aria-labelledby`.
- State must not rely on colour: knob position and on/off text or icon need 3:1 non-text contrast (1.4.11). Target at least 24×24 CSS px (2.5.8). 4.1.2 applies.
- Send any async result to a `role=status` polite region.
- RN: `accessibilityRole='switch'`, `accessibilityState {checked, disabled}`; announce failures with `AccessibilityInfo.announceForAccessibility`.

## Reduced motion

Under `prefers-reduced-motion` and the OS Reduce Motion setting, the thumb snaps to its end position (or cross-fades) and the colour changes instantly. Position, fill and the on/off icon or text still carry the state, so nothing is lost. Reanimated `withSpring`/`withTiming` already jump to the target under `ReduceMotion.System`.

## Keyboard

Space toggles; Enter may also toggle (APG). Tab and Shift+Tab move focus in and out.

## Performance

- The thumb uses compositor-only `transform`. The `background-color` change repaints a tiny area, which is acceptable.
- Do not put `will-change` on every row of a long settings list.
- In RN, Reanimated runs on the UI thread; avoid JS-thread `Animated` without `useNativeDriver` in long FlatLists.

## Primitives to reuse

- Web: native checkbox input with `role=switch`; Radix UI Switch (`data-state` checked/unchecked, hidden input for forms, follows APG); React Aria Switch.
- Native: RN core `Switch`; `@expo/ui` Switch.

## Tests

- Automated: `getByRole('switch', {name})` toggles `aria-checked` on Space and click; the label text is unchanged after a toggle; a failed save reverts the state and shows an error; under emulated reduced motion, no `transition-duration` above 0 on `transform`.
- Visual QA: 3:1 contrast of knob against track and track against background in both themes; state legible without colour; visible focus ring; target of at least 24 px (44 pt iOS, 48 dp Android).

## State integrity

- The thumb may move optimistically (React `useOptimistic`), but a pending cue (spinner or "Saving…") stays visible until the server confirms.
- Downstream confirmation such as "Alerts enabled" waits for that confirmation.
- On failure, revert the thumb and announce the error.
- Ignore or queue repeat taps while pending; show offline changes as "pending sync".

## References

- [WAI-ARIA APG: Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
- [NN/g: Toggle switch guidelines](https://www.nngroup.com/articles/toggle-switch-guidelines/)
- [Apple HIG: Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles)
- [Material Components Android: Motion](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)
- [Radix UI: Switch](https://www.radix-ui.com/primitives/docs/components/switch)
- [Reanimated: withSpring](https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-reanimated/docs/animations/withSpring.mdx)
- [Expo UI: universal components](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal.md)
- [Expo UI: universal Switch](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/switch.md)

## Not verified

- Whether RN core `Switch` inherits the automatic iOS switch haptic. HIG confirms system switches play haptics on supported iPhones; the RN wrapper was not checked.
- The stability level of `@expo/ui` universal components; the SDK 58 docs state no alpha, beta or stable label.
- The NN/g claims on this page were not opened by the first reader.
