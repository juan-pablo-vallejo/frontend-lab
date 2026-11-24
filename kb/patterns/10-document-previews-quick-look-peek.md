---
number: 10
name: Document previews (quick look, peek)
classes: [comprehension, error-prevention, navigation]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
  - https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
  - https://docs.expo.dev/router/reference/link-preview/
  - https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using_interest_invokers
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style
  - https://bcd.developer.mozilla.org/bcd/api/v0/current/html.elements.button.interestfor.json
  - https://api.webstatus.dev/v1/features/popover-hint
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overlay
  - https://docs.expo.dev/router/advanced/modals.md
  - https://docs.expo.dev/router/migrate/sdk-55-to-56.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 10. Document previews (quick look, peek)

Let users confirm an item's content without leaving their place. Grow the preview from its
source and dismiss it instantly. Never hide essential content or actions behind hover-only
peeks.

## Use when

Lists of files, attachments, job photos or records where users must check they have the right
item before acting (attach, approve, send), or scan several items quickly. In dense office
software, a persistent side-panel preview beats a modal for sequential review.

## Avoid when

- The preview is the only path to an action.
- It appears on hover in a dense table and fires constantly.
- Users wait on a heavy render each time they arrow through a list: use a cached thumbnail or
  a skeleton.
- Long-press peek is the only route, on Android or for screen-reader users.

## Web technique

- Prefer a persistent master-detail preview pane; it needs no motion.
- Otherwise a modal `<dialog>` opened by a button (Space/Enter), animated with
  `@starting-style` plus a transition on opacity and `transform: scale(0.96 to 1)` and
  `display`/`overlay` `allow-discrete`.
- Dialog exit transitions through `display`/`overlay` `allow-discrete` run fully only in
  Chromium; elsewhere the dialog closes instantly. `@starting-style` entry works everywhere.
- Use a View Transition from the thumbnail only when continuity matters.
- Hover peeks with `popover="hint"` and `interestfor` are enhancement only: `interestfor` is
  Chromium-only (absent in Firefox and Safari, marked experimental) and `popover="hint"` is
  limited availability. The trigger stays a normal link or button.
- Animate only opacity and transform; never width, height, top or left of the preview.

## Native technique

- iOS: Expo Router `Link.Preview` / `Link.Trigger` / `Link.Menu` (peek and pop, iOS-only,
  SDK 54+). Add no haptic of your own; whether the system supplies one is not verified.
- Android and fallback: tap opens an Expo Router Stack screen with `presentation: 'formSheet'`
  and `sheetAllowedDetents`, or a modal screen with a Close button. Android allows at most 3 detents and no native header or nested stack inside a form sheet.
- Do not rely on long-press alone.
- A native document Quick Look through a core or Expo API is not verified.

## Timing

Open 150-250ms with ease-out or a critically damped spring growing from the source; close
100-200ms with ease-in. Material container transform uses 300ms in and 250ms out for full
screen; previews should be shorter. Never delay cached content behind animation.

## Accessibility

- Modal preview: `role=dialog` with `aria-modal=true` and `aria-labelledby` set to the
  document name. Move focus into the dialog (title or first control), trap Tab, close on
  Escape and return focus to the invoking item (APG).
- Hover or focus previews meet WCAG 1.4.13: dismissible with Esc, hoverable, persistent.
- Also WCAG 2.1.1, 2.4.3, and 2.5.7 when the preview can be dragged.
- RN: `accessibilityViewIsModal` on the preview container (iOS), a labelled Close button
  with `accessibilityRole="button"`, and `onAccessibilityEscape` (iOS two-finger Z) to close.

## Reduced motion

Replace the scale-from-source with a 100-150ms crossfade or an instant appearance. The
preview header names the document and its position (for example "Invoice 3 of 12"), so the
spatial link is carried in text. Reanimated omits exiting and shared transitions
automatically under `ReduceMotion.System`.

## Keyboard

Enter or Space on the focused item opens the preview; Escape closes it and returns focus; Tab
cycles inside the modal. Left/Right (or Up/Down in a list) to move to the adjacent item while
previewing is optional and not an APG requirement; document it if added.

## Performance

Opacity and transform are compositor-only. Rendering PDFs or large images is the real cost:
show a low-resolution thumbnail first and decode off the main thread (`expo-image` on
native). Don't mount a heavy preview for every row of a virtualized list, and debounce hover
peeks.

## Primitives to reuse

- Web: native `<dialog>`, Popover API (Baseline 2025, newly available Jan 2025), Radix
  Dialog or React Aria Modal.
- Native: Expo Router `Link.Preview` (iOS); Expo Router Stack with
  `presentation: 'formSheet'`, not `@react-navigation/native-stack`.

## Tests

- The dialog has an accessible name; focus moves in on open and back to the trigger on
  close; Escape closes; the background is inert while modal.
- Hover previews stay open while the pointer moves onto them and close on Esc.
- Visual QA: the preview grows from the correct item, nothing shifts behind it, and a loading
  state appears instead of a blank frame.

## State integrity

For a just-uploaded or just-edited file, the preview may show the local copy only when it is
labelled local or pending (for example "Uploading"). Show it as the stored version only after
the server confirms, and never show a cached thumbnail as current after a failed save.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
- https://docs.expo.dev/router/reference/link-preview/
- https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using_interest_invokers
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style

## Not verified

- That the system supplies the press haptic for Expo Router `Link.Preview`: the Expo
  link-preview doc does not mention haptics.
- Whether any core React Native or Expo API offers native document Quick Look: not searched.
- Material container transform 300ms in / 250ms out: the Material Components Android
  Motion.md table gives it, but the current `MaterialContainerTransform` source maps to
  `motionDurationLong2` / `motionDurationMedium4` (500ms / 400ms in the same doc's token
  table). The Material 3 site was not opened.
- The exact Chrome version for `interestfor`: MDN compat data says 142, the web-features API
  says 149; both agree it is Chromium-only. Safari support for `popover="hint"` also differs
  between the two (27.3 against none).
