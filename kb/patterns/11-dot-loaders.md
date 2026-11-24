---
number: 11
name: Dot loaders
classes: [decorative, functional-feedback]
tier: rarely-justified
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
  - https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/
  - https://web.dev/articles/animations-guide
  - https://www.nngroup.com/articles/progress-indicators/
  - https://reactnative.dev/docs/accessibility
  - https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/packages/react-native-reanimated/src/animation/repeat.ts
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (3 corrections applied).
---

# 11. Dot loaders

Default to the platform spinner. Use animated dots only for an in-stream "someone or something is typing or thinking" cue in chat or assistant UIs, with text for assistive technology.

## Use when

- A conversational or assistant stream where a reply is being composed and a spinner would read as a page load.
- An inline ellipsis inside a line of text.

## Avoid when

- As the general loading indicator for buttons, pages, or data tables in operational software. It carries no more information than a spinner, and bouncing dots add vertical motion.
- Measurable work: use a bar.
- Waits over 10 s.

## Web technique

- Three `aria-hidden` spans with staggered `animation-delay`, animating `opacity` (preferred) or `transform: scale`.
- Never translate vertically with `top` or `margin`, and avoid large `translateY` bounces.
- Pair them with a visually hidden `role=status` text. No library needed.

## Native technique

- Prefer `ActivityIndicator`.
- If dots are required: three Views with Reanimated `withRepeat` plus `withDelay` on `opacity` (UI thread).
- No haptic.

## Timing

Cycle about 1.0 to 1.4 s, stagger about 150 to 200 ms, ease-in-out (heuristic; no primary source found).

## Accessibility

- Hide the dots (`aria-hidden`).
- Announce once via `role=status` (polite), for example "Assistant is typing" / "Escribiendo…", and not on every cycle.
- If the region is loading, set `aria-busy`.
- WCAG 4.1.3. WCAG 2.2.2 applies only when the dots start automatically, run over 5 s and sit beside other content; dots started by the user's own action are outside it.
- RN: hide the dots with `importantForAccessibility='no-hide-descendants'` (Android) and `accessibilityElementsHidden` (iOS), then expose a Text label or call `AccessibilityInfo.announceForAccessibility` once.

## Reduced motion

- Show a static ellipsis with the text label, or an opacity-only slow fade (WCAG 2.3.3 excludes opacity).
- RN: do not rely on implicit behaviour. A reversed infinite `withRepeat` does not start; a non-reversed one runs once and stops at `toValue`, which can leave dots dim or invisible. Branch on `useReducedMotion` and render static full-opacity dots plus the label.

## Keyboard

Not applicable: a non-interactive status display.

## Performance

- `opacity` and `transform` animations are compositor-only on the web and run on the UI thread with Reanimated.
- Unmount the dots when the reply arrives. Several dot loaders running at once in a list cost battery.

## Primitives to reuse

No mainstream accessible dot-loader primitive was verified. Adapt React Aria `ProgressBar` (`isIndeterminate`) on the web and `ActivityIndicator` on native rather than building one.

## Tests

- The dots are `aria-hidden`.
- A status text exists and is announced once.
- Under reduced motion, `getAnimations()` is empty or opacity-only.
- The component unmounts when the content arrives.
- Visual QA: no vertical jitter of the surrounding text line; dot contrast.

## State integrity

Not applicable. The loader only signals "in progress" and must disappear as soon as the response arrives or fails, replaced by an error if it fails.

## References

- [WCAG 2.2 Understanding 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [Reanimated: accessibility guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)
- [web.dev: animations guide](https://web.dev/articles/animations-guide)
- [NN/g: progress indicators](https://www.nngroup.com/articles/progress-indicators/)
- [React Native: accessibility](https://reactnative.dev/docs/accessibility)
- [Reanimated source: repeat.ts](https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/packages/react-native-reanimated/src/animation/repeat.ts)
- [WCAG 2.2 Understanding 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

## Not verified

- The dot cycle and stagger timings have no primary source.
