---
number: 44
name: Inline form validation
classes: [error-prevention, functional-feedback]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
  - https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - https://design-system.service.gov.uk/patterns/validation/
  - https://baymard.com/blog/inline-form-validation
  - https://alistapart.com/article/inline-validation-in-web-forms/
  - https://api.webstatus.dev/v1/features?q=id:user-pseudos
  - https://raw.githubusercontent.com/reactjs/react.dev/main/src/content/reference/react-dom/components/form.md
  - https://html.spec.whatwg.org/multipage/form-control-infrastructure.html
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 44. Inline form validation

Validate a field only after the user finishes it or submits, clear the error as soon as it is fixed, show text plus an icon next to the field, and summarise errors on submit.

## Use when

- Any form with constraints. Inline checks help most on hard fields (passwords, usernames, IDs, formatted codes).
- Baymard recommends checking fixed-length fields (ZIP, phone) once they are complete.
- Remove an error on the keystroke that corrects it.

## Avoid when

- Never validate on focus or while open-ended text is being typed: the "before and while" timing produced the highest error rates in the LukeW study.
- Never flag an empty required field because the user tabbed through it.
- No shaking or animated error text (NN/g: hard to read), and no success checkmarks on trivial fields (only 30–50% noticed them).
- Sources conflict on blur: GOV.UK says validate on submit, not on blur; NN/g, Baymard and LukeW favour validating on exit. Pick one per product and apply it everywhere.

## Web technique

1. Native constraint attributes (`required`, `pattern`, `min`/`max`, `type`) plus `:user-invalid`, so styling applies only after interaction. It has been Baseline since Nov 2023 and widely available since May 2026 (Chrome 119, Firefox 88, Safari 16.5). Never use `:invalid`, which matches on load.
2. When you render your own error summary, put `noValidate` on the form; otherwise the browser blocks submit with its own bubbles and neither the summary nor the form action runs. `:user-invalid` still works.
3. Render the message in a pre-existing element referenced by `aria-describedby`, and set `aria-invalid="true"`. Reveal it with opacity in at most 150 ms, reserving space or accepting a one-time layout shift. Do not animate height (`interpolate-size` is Chrome-only, not Baseline).
4. On submit: an error summary at the top with links to the fields, focus moved to it, and "Error: " prefixed to the document title (GOV.UK).
5. React 19 / Next 16: form actions with `useActionState` for server errors. React 19 resets uncontrolled fields after a form action, even one that returns a validation error: return the submitted FormData through `useActionState` into `defaultValue`.
6. React Hook Form is optional; mode `onTouched` maps to validate-after-blur.

## Native technique

- `TextInput` plus an error `Text` below it, with the error string in `accessibilityHint` or appended to the `TextInput`'s `accessibilityLabel`.
- Announce new errors with `AccessibilityInfo.announceForAccessibility` (iOS can queue through `announceForAccessibilityWithOptions {queue:true}`). Android can use `accessibilityLiveRegion='polite'` on the error `Text`.
- On submit failure, `Haptics.notificationAsync(Error)` once, and move accessibility focus to the first error (`sendAccessibilityEvent` `'focus'`). No haptic for per-field errors.

## Timing

- The error appears at once after blur or submit (opacity over 0–150 ms, no motion); it clears on the next keystroke that fixes it.
- A debounced server check (for example availability) waits about 300–500 ms after typing stops; see Not verified.
- Never shake.

## Accessibility

- 3.3.1 (A): identify the field and describe the error in text; colour is a supplement only (1.4.1). 3.3.3 suggests a fix; 3.3.2 covers labels and instructions.
- 4.1.3 (AA): an inline error that appears without a focus change is a status message. Use a polite live region, or `role=alert` sparingly; WCAG treats assertive announcements of non-urgent content as a failure.
- Focusing the summary on submit is a change of context and needs no live region.
- `aria-invalid` with `aria-describedby`; `aria-errormessage` only when `aria-invalid=true`.
- A visually hidden "Error:" prefix, localised ("Error:" is also the Spanish word).
- RN: `announceForAccessibility`; `accessibilityLiveRegion` is Android only; `accessibilityState` is not enough alone, so put the text in the hint or label.

## Reduced motion

No shake, slide or height animation. The message appears in place instantly, with red text, an icon, a border and a background tint, and the text carries the error. The error summary and the focus move are unaffected.

## Keyboard

Not a widget. Errors never steal focus while typing; on submit, focus moves to the error summary, whose links move focus to the fields; inserting errors leaves Tab order unchanged.

## Performance

- Run synchronous validators on blur and submit, not on every keystroke, except for clearing an error.
- Debounce async checks and cancel stale ones with `AbortController`.
- Inserted messages shift layout; reserve a line in dense grids if shifting rows disorients.
- RN: do not re-validate a whole large form on each keystroke.

## Primitives to reuse

- Web: native constraint validation plus `:user-invalid`; React 19 `useActionState`; React Aria TextField (`validationBehavior` `'aria'`/`'native'`, `isInvalid`, `errorMessage`); GOV.UK Error message and Error summary components (reference behaviour).
- Native: `TextInput` plus `AccessibilityInfo`.

## Tests

- Automated: no error on load or on focus; an invalid value followed by blur shows the message (per the chosen timing); `aria-invalid=true` and `aria-describedby` point to the message text; fixing the value removes the error on keystroke; submitting with errors focuses the summary, the title starts with "Error:", and summary links focus the fields; Spanish copy is present.
- Visual QA: text plus icon, not colour alone; messages near their fields; no layout jank in multi-column forms; readable red in both themes.

## State integrity

- Client checks may say "format looks valid" but never imply server facts (username available, account exists, record saved) before the server responds.
- A green check is never a submission confirmation.
- Server errors override client "valid" states and keep the user's entered values (GOV.UK).
- While an async check is pending, show "Checking…", not a check or an error.

## References

- [WCAG 2.2 Understanding 3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)
- [WCAG 2.2 Understanding 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/)
- [Baymard: Inline form validation](https://baymard.com/blog/inline-form-validation)
- [A List Apart: Inline validation in web forms](https://alistapart.com/article/inline-validation-in-web-forms/)
- [webstatus.dev: user-pseudos](https://api.webstatus.dev/v1/features?q=id:user-pseudos)
- [React: form component reference](https://raw.githubusercontent.com/reactjs/react.dev/main/src/content/reference/react-dom/components/form.md)
- [HTML standard: form control infrastructure](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html)

## Not verified

- The LukeW figures ("before and while" gave the highest error rates; only 30–50% noticed success checks); the article text read did not show them.
- The 300–500 ms debounce convention for async checks; no source found.
- The NN/g and Baymard claims on this page were not opened by the first reader.
