---
number: 2
name: Selection and like bursts
classes: [emotional-engagement, decorative, functional-feedback]
tier: rarely-justified
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/button/
  - https://www.nngroup.com/articles/animation-duration/
  - https://www.nngroup.com/articles/animation-purpose-ux/
  - https://react.dev/reference/react/useOptimistic
  - https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
  - https://api.webstatus.dev/v1/features/web-animations
  - https://raw.githubusercontent.com/facebook/react-native-website/main/website/versioned_docs/version-0.88/accessibility.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (2 corrections applied).
---

# 2. Selection and like bursts

Show selection with an instant, labelled state change (fill, colour plus shape, aria-pressed). Add a particle or scale burst only in consumer or social contexts, never on repeated operational selections.

## Use when

A rare, low-stakes, emotionally meaningful toggle such as favouriting or reacting in a consumer or social surface, where the user does it a few times per session.

## Avoid when

- Row selection, bulk select, starring work items, marking a task done, or anything office staff or field workers do dozens of times an hour.
- Any toggle whose result is not yet confirmed by the server.
- Dense tables or lists where a burst would overlap neighbouring rows.

## Web technique

- Use a native `<button aria-pressed>` (or `<input type=checkbox>` for list selection). Switch the icon between outline and filled, plus colour, in CSS from `[aria-pressed=true]`.
- If a burst is justified, animate only `transform` (scale) and `opacity` on pseudo-elements or with a short Web Animations API keyframe (Baseline newly available 2020-09-16, widely available since 2023-03-16).
- Never animate `width`, `height`, `top`/`left`, `box-shadow` or `filter`, and do not add a library for this.

## Native technique

- Use `Pressable` with `accessibilityRole="togglebutton"` and `accessibilityState {checked}`. Do not set `role`: its value list has no `togglebutton` and it overrides `accessibilityRole`.
- Swap the icon on state change.
- An optional burst uses a Reanimated `withSpring` on scale and opacity with `reduceMotion: ReduceMotion.System`.
- If you add a haptic, use `Haptics.selectionAsync()` when the state flips (not on press-in), and only in consumer contexts.

## Timing

- The state change (fill or colour) takes about 100 ms or happens instantly. NN/g advises about 100 ms for small toggle feedback and says 500 ms starts to feel like a drag.
- A decorative burst, if used, finishes in 300 to 450 ms with a single bouncy spring overshoot and never blocks the next input.

## Accessibility

- Role button with `aria-pressed` true/false and a constant label (APG: "Like" stays "Like" and is announced as pressed).
- The burst element is `aria-hidden`. Focus stays on the button.
- A changed count may be announced through a polite `role=status` region, only if it matters.
- WCAG at stake: 4.1.2 (state exposed), 1.4.1 (state not by colour alone, so change the icon shape too), 2.3.3 AAA (scale motion from an interaction must be suppressible), 2.3.1 (a burst must not flash more than 3 times per second).
- React Native: `accessibilityRole` togglebutton plus `accessibilityState {checked}`, per the RN docs (`aria-pressed` is not listed in RN).

## Reduced motion

- Do not render the burst or scale at all. The outline-to-filled icon swap, the colour change and the updated count carry the full meaning, optionally with a 100 ms opacity crossfade (opacity is not motion under WCAG 2.3.3).
- On native, `ReduceMotion.System` makes `withSpring` jump to its final value.
- `useReducedMotion` reads the setting at app launch only, so subscribe to `AccessibilityInfo` `reduceMotionChanged` for live changes.

## Keyboard

Enter and Space toggle the button (APG Button pattern). In multi-select lists, follow the APG listbox or grid pattern instead; this pattern does not apply to those.

## Performance

- Compositor-only if limited to `transform` and `opacity`.
- Particle bursts multiply layers: mount them only on activation and unmount them on `animationend`.
- Never keep a burst node per row in virtualised lists such as FlatList or FlashList.
- Lottie or canvas bursts cost main or JS thread time and battery, which is not worth it on field devices.

## Primitives to reuse

- Web: React Aria `ToggleButton` (react-aria-components 1.22.1) or Radix Toggle (@radix-ui/react-toggle 1.2.1; `data-state` on/off, Space and Enter).
- Native: `Pressable` with the togglebutton role, and Reanimated 4.x for the optional spring.

## Tests

- `aria-pressed` (web) or `accessibilityState.checked` (native) flips on Enter, Space and click.
- The label text stays constant.
- The burst node is `aria-hidden` and absent under emulated `prefers-reduced-motion`.
- A failed request restores the previous state and shows an error.
- Visual QA: the selected state is distinguishable in greyscale, the burst does not overflow neighbouring rows or clip, and rapid double taps leave no stuck particles.

## State integrity

- You may fill the icon optimistically for low-stakes, reversible toggles. React `useOptimistic` shows the optimistic value only while the Action is pending, then reverts to the real value on failure. Show an error when it reverts.
- Fire any burst or success haptic only after the server confirms, or skip it: a celebration followed by a silent revert is misleading.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/button/
- https://www.nngroup.com/articles/animation-duration/
- https://www.nngroup.com/articles/animation-purpose-ux/
- https://react.dev/reference/react/useOptimistic
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- https://api.webstatus.dev/v1/features/web-animations
- https://raw.githubusercontent.com/facebook/react-native-website/main/website/versioned_docs/version-0.88/accessibility.md

## Not verified

- How VoiceOver and TalkBack announce `accessibilityRole` togglebutton with `accessibilityState.checked` on a device (the docs confirm the props only).
- The NN/g animation-purpose page was not opened; the 300 to 450 ms burst duration has no primary source.
