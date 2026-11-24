---
number: 13
name: Button submission feedback
classes: [functional-feedback, error-prevention, perceived-performance]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://react.dev/reference/react-dom/hooks/useFormStatus
  - https://react-aria.adobe.com/Button
  - https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - https://www.nngroup.com/articles/response-times-3-important-limits/
  - https://developer.apple.com/design/human-interface-guidelines/buttons
  - https://developer.apple.com/design/human-interface-guidelines/feedback
  - https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission
  - https://www.w3.org/WAI/ARIA/apg/patterns/button/
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (4 corrections applied).
---

# 13. Button submission feedback

On submit, immediately mark the button pending, block resubmission and keep focus. Announce the real outcome only after the server responds, using text and not only a spinner or check.

## Use when

Any form submission, save, send, post or server-backed command whose round trip can exceed about 100 ms. That is every networked save in operational software, including flaky field connectivity.

## Avoid when

- Purely local or instant actions (under 100 ms), where a pending flash would flicker.
- Celebratory success animations, modal "Success!" dialogs or forced delays on routine repeated saves. Per Apple HIG, people typically expect their action to succeed and mainly need to know when it fails.

## Web technique

- Use a native `<form action>` with `<button type=submit>`. A child component reads React 19 `useFormStatus().pending` to set `disabled` or `aria-disabled`, `aria-busy`, and to swap the label ("Save" to "Saving…", "Guardar" to "Guardando…").
- When pending uses `aria-disabled` (focusable) instead of `disabled`, also block resubmission in code: return early from the action, or `preventDefault` in `onSubmit`, while pending. Per HTML, implicit Enter submission is skipped only when the default button is actually disabled.
- Show a spinner through an opacity transition delayed by about 1 s (NN/g's 1 s limit). Animate only `opacity` and `transform` rotate.
- Keep both labels stacked in one CSS grid cell so EN and ES widths do not shift layout. Never animate `width` or `padding`.

## Native technique

- `Pressable` or a custom button with a pending flag: set `disabled`, `accessibilityState {busy: true, disabled: true}`, and show an `ActivityIndicator` next to an alternative label (Apple HIG: an activity indicator in the button, for example "Checking out…").
- Call `Haptics.notificationAsync(Success)` or `(Error)` only when the response arrives, never on tap.

## Timing

- The pending state appears within one frame of activation (NN/g: under 0.1 s feels instantaneous).
- Delay the spinner until about 1 s.
- After about 10 s, show a percent-done or expected-completion indicator (NN/g). A cancel option is a reasonable addition but does not come from the cited NN/g page.
- Label and indicator crossfades take 100 to 200 ms ease-out.
- A success label such as "Saved" may linger 1.5 to 2 s before reverting; that duration is a convention without a primary source.

## Accessibility

- A native button keeps its role. While pending, prefer `aria-disabled` with the button still focusable. React Aria `isPending`: pending buttons stay focusable but are otherwise disabled, and the pending change is announced.
- Focus stays on the button (APG Button: focus remains when the context is not dismissed). On failure choose one: keep focus and announce through `role=alert`, or move focus to an error summary without `role=alert`. The error-summary focus move is common practice, not an APG rule.
- Announce success through `role=status` (polite). Use `role=alert` only for important, time-sensitive content.
- WCAG at stake: 4.1.3 Status Messages (its examples include a successful form submission and a count of errors on the page), 3.3.4 (reversible, checked or confirmed for legal, financial or data changes), 4.1.2.
- React Native: `accessibilityState {busy}`. Announce with `AccessibilityInfo.announceForAccessibility`, or `announceForAccessibilityWithOptions` with `queue: true` on iOS. `accessibilityLiveRegion` polite works on Android only.

## Reduced motion

Replace the rotating spinner with a static "Saving…" / "Guardando…" label plus a non-moving busy icon, or a slow opacity pulse. The text carries the waiting state, so nothing is lost. The success check appears without a draw-on or scale animation.

## Keyboard

- Enter and Space activate the button (APG). Enter in a text field submits the form natively.
- While pending, repeated Enter must not resubmit.
- Focus remains on the button unless the context changes.

## Performance

- The spinner rotation and opacity are compositor-only.
- Avoid re-rendering the whole form on pending; `useFormStatus` confines the change to the button subtree.
- On mobile, keep the JS thread free during submission so the indicator and press feedback stay smooth, and use a native `ActivityIndicator` rather than a JS-driven loop.

## Primitives to reuse

- Web: `<form action>` plus `useFormStatus` (React 19); React Aria `Button` `isPending` (keeps focus, announces pending; its docs recommend keeping the ProgressBar in the accessibility tree immediately and delaying visibility with `opacity: 0`).
- Native: `Pressable` plus `ActivityIndicator` with `accessibilityState` busy.

## Tests

- A double click or double Enter sends exactly one request.
- The button exposes busy or disabled while pending.
- Success text appears in a `role=status` node only after a mocked 2xx.
- On a mocked failure: the error is announced, field values are retained, and the button is re-enabled with focus preserved.
- Visual QA: no layout shift between EN and ES labels, no spinner for sub-second saves, contrast holds in the disabled or pending state.

## State integrity

- Before confirmation you may show only "Saving…", the pending indicator and disabled resubmission.
- Do not show "Saved", a check, a success haptic, a navigation away or a cleared form until the server confirms.
- On failure or offline, keep the user's data, state plainly that nothing was saved, and offer retry.
- If writes are queued offline, label them "Queued – will send when online", not "Saved".

## References

- https://react.dev/reference/react-dom/hooks/useFormStatus
- https://react-aria.adobe.com/Button
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- https://www.nngroup.com/articles/response-times-3-important-limits/
- https://developer.apple.com/design/human-interface-guidelines/buttons
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission
- https://www.w3.org/WAI/ARIA/apg/patterns/button/

## Not verified

- The 1.5 to 2 s "Saved" linger duration.
- Screen-reader support for `aria-busy` on a button.
- That a W3C source recommends moving focus to an error summary; the WAI Forms tutorial was opened but the focus guidance was not found.
