---
number: 53
name: Animated numerical counters
classes: [decorative, comprehension, emotional-engagement]
tier: rarely-justified
status: researched
date: 2026-11-23
sources:
  - https://number-flow.barvian.me/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-variant-numeric
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
  - https://www.nngroup.com/articles/animation-duration/
  - https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
  - https://raw.githubusercontent.com/facebook/hermes/main/doc/IntlAPIs.md
  - https://reactnative.dev/docs/text-style-props
  - https://raw.githubusercontent.com/barvian/number-flow/main/packages/number-flow/src/ssr.ts
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (2 corrections applied).
---

# 53. Animated numerical counters

In operational software, show the final value of a number immediately. At most, use a brief digit transition when a watched value changes, and never count up from zero on load.

## Use when

- A live value the user is watching changes in place (a cart total, units remaining, a queue count), and a short transition helps them notice the direction of change.
- Marketing or summary screens where emotional emphasis is the goal.

## Avoid when

- Dashboard KPIs or table cells on load: counting up from 0 delays reading the real value on every visit and slows repeated scanning.
- Values in dense tables or lists.
- Any value users copy or act on immediately.
- Values not yet confirmed by the server.

## Web technique

1. Render the final formatted value as text immediately (`Intl.NumberFormat` with the user's locale; Baseline widely available) with `font-variant-numeric: tabular-nums` (Baseline widely available) so digits do not jitter. `es` formats 1234 as "1234" but `es-MX` as "1,234" (verified in Node Intl), so pick the locale deliberately.
2. For change emphasis, prefer a 150 to 300 ms background or opacity flash plus a static delta ("+3").
3. If digit rolling is truly wanted: NumberFlow (`@number-flow/react` 0.6.2, MIT, published July 2026). `respectMotionPreference` defaults to `true`; it exposes the final value as `role=img` with `aria-label`; it does not support scientific or engineering notation, non-Latin digits or RTL locales.
4. Never animate `width` or `font-size`, and do not `setState` every frame.

## Native technique

- A plain `<Text>` with the final value from `Intl.NumberFormat`. Hermes uses the OS's ICU, so output can differ by OS version: test `es` and `es-MX` on devices.
- Build the signed delta manually: `signDisplay` is unsupported on iOS Hermes.
- Use `fontVariant: ['tabular-nums']` (a documented RN text style).
- For change emphasis, a Reanimated opacity or color flash on the UI thread. Avoid per-frame JS text updates.
- No haptic for value changes.

## Timing

- Change flash or digit transition 150 to 300 ms ease-out (NN/g: frequent animations should be short and subtle; over 500 ms feels like a drag).
- NumberFlow examples use 750 ms, which is too slow for operational use.
- Count-up from zero: do not.

## Accessibility

- Assistive technology receives only the final value: make the animated digits `aria-hidden` and expose the final value as text (or `aria-label`), never intermediate frames.
- Do not wrap a ticking counter in a live region. If the change matters, announce it once politely ("Total: 1,234 units" / "1234 unidades").
- Direction must not rely on colour or motion alone: use an icon plus a signed delta.
- WCAG 4.1.3, 2.3.3, 2.2.2 (auto-starting count-ups over 5 s).
- RN: `accessibilityLabel` with the final value, and `announceForAccessibility` for important changes.

## Reduced motion

- Show the final value instantly. A static signed delta ("▲ +3", with text) and an optional brief non-moving highlight replace what the motion carried (that it changed, and which way).
- NumberFlow does this by default; Reanimated `withTiming` returns the target value immediately under `ReduceMotion.System`.

## Keyboard

Not applicable: display-only text with no interaction.

## Performance

- JS-driven count-ups re-render React every frame (main thread or JS thread); `transform` or `opacity` digit animations run on the compositor or the UI thread.
- Never animate counters inside virtualized lists or table cells.
- A change in digit count can shift layout unless the width is reserved or `tabular-nums` is used.

## Primitives to reuse

- Web: NumberFlow (`@number-flow/react`); React Aria number formatting via `formatOptions` (Intl).
- Native: `Text` plus Intl; Reanimated for the highlight only.

## Tests

- Immediately after an update, `textContent` or the accessible name equals the final Intl-formatted value for `en-US`, `es`, and `es-MX`.
- No intermediate values appear in the accessibility tree or the live region.
- Under reduced motion there are no running animations.
- The delta indicator includes text, not only colour.
- Visual QA: no horizontal jitter (`tabular-nums`), no layout shift when digits are added, duration under 300 ms.

## State integrity

- Animate or update only to server-confirmed values.
- An optimistic increment (for example +1 after a local action) is visibly marked pending and rolls back with an error if the server rejects it.
- Never count up to a total that has not been committed (balances, stock, synced-record counts).

## References

- [NumberFlow](https://number-flow.barvian.me/)
- [MDN: font-variant-numeric](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-variant-numeric)
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [NN/g: animation duration](https://www.nngroup.com/articles/animation-duration/)
- [WCAG 2.2 Understanding 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [Hermes: Intl APIs](https://raw.githubusercontent.com/facebook/hermes/main/doc/IntlAPIs.md)
- [React Native: text style props](https://reactnative.dev/docs/text-style-props)
- [NumberFlow source: ssr.ts](https://raw.githubusercontent.com/barvian/number-flow/main/packages/number-flow/src/ssr.ts)

## Not verified

- The Hermes Intl limitations come from the Hermes repository doc on `main`, which references ECMA-402 7th edition; whether it is current for the Hermes shipped with React Native 0.88 was not confirmed.
- NumberFlow's `role=img` / `aria-label` output comes from its source (`ssr.ts`), not its documentation; its behaviour inside live regions and copy/paste of the value were not checked.
