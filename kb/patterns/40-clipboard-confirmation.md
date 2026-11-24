---
number: 40
name: Clipboard confirmation
classes: [functional-feedback]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
  - https://developer.android.com/develop/ui/views/touch-and-input/copy-paste
  - https://docs.expo.dev/versions/latest/sdk/clipboard/
  - https://github.com/github/clipboard-copy-element
  - https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - https://api.webstatus.dev/v1/features/popover
  - https://api.webstatus.dev/v1/features/starting-style
  - https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html
evidence: Researched from the listed sources on 2026-11-23, then checked against them by a second reader (2 corrections applied).
---

# 40. Clipboard confirmation

After a copy succeeds, confirm in place (icon and label swap to "Copied") plus one polite announcement. On Android 13+ native, rely on the system confirmation instead of adding a toast.

## Use when

Any copy button: IDs, addresses, tracking numbers, phone numbers, share links. These are frequent in operational software, so keep the confirmation lightweight and inline.

## Avoid when

- A toast or snackbar on Android 13+, where the system already confirms the copy; Android strongly recommends removing in-app copy toasts and snackbars there.
- Stacked toasts when users copy many values in a row.
- Hijacking native Ctrl/Cmd+C.

## Web technique

- A `<button>` calling `await navigator.clipboard.writeText(text)`. `writeText` is Baseline widely available since March 2020 and requires a secure context; the broader Async Clipboard feature reached Baseline in 2024.
- On resolve, swap the icon and visible text to "Copied" / "Copiado" with an opacity crossfade, and revert after about 2 s.
- A tooltip-style bubble can use `[popover]` (Baseline newly available since 2025-01-27) with `@starting-style` (newly available since 2024-08-06), animating `opacity` and `transform` only, as an enhancement over the inline "Copied" swap.
- Reference: `<clipboard-copy>` (@github/clipboard-copy-element 1.3.2), which fires a `clipboard-copy` event but leaves announcements to you.

## Native technique

- expo-clipboard `setStringAsync(text, {android: {isSensitive}})` for secrets, so they are hidden from the Android 13+ preview.
- On Android API 33+, skip the in-app toast and keep only a subtle inline icon swap.
- On iOS and older Android, use the inline "Copied" swap plus `AccessibilityInfo.announceForAccessibility`.
- Optional haptic: `Haptics.selectionAsync()` or `impactAsync(Light)` on success, not on press-in.

## Timing

- Icon or label crossfade of 100 to 150 ms.
- Keep "Copied" visible about 1.5 to 2 s, then revert without animation; that duration is a convention.
- Restart the timer on repeat copies rather than queuing them.

## Accessibility

- If the visible button text changes to "Copied", let the accessible name change with it: the name must contain the visible text (WCAG 2.5.3).
- For a constant name ("Copy tracking number"), use an icon-only button with a fixed `aria-label` and put "Copied" in adjacent `role=status` text.
- Announce once, politely. Focus stays on the button.
- WCAG at stake: 4.1.3 Status Messages (the result of an action, not focus-changing), 4.1.2, 2.5.8.
- React Native: `accessibilityRole` button. `AccessibilityInfo.announceForAccessibility` interrupts by default; on iOS use `announceForAccessibilityWithOptions` with `{queue: true}`. On Android 13+ the system UI provides the confirmation; still announce.

## Reduced motion

Instant swap of icon and text to "Copied", with no slide, bounce or popover motion. Text and the polite announcement carry the confirmation.

## Keyboard

Enter and Space activate the copy button (APG Button). Text in the page stays natively selectable and copyable with Ctrl/Cmd+C.

## Performance

- Trivial cost: opacity only, with no layout shift if both labels share one grid cell.
- Clear the revert timer on unmount.
- In virtualised lists, key the copied state by item id so recycled rows do not show a stale "Copied".

## Primitives to reuse

- Web: @github/clipboard-copy-element, or a React Aria `Button` plus your own `role=status` region.
- Native: expo-clipboard (SDK 58), with a `Platform.Version` check for Android 33+.

## Tests

- Mock `writeText` and assert "Copied" appears only after it resolves.
- On `NotAllowedError`, show a fallback ("Press Ctrl+C", with the text selected).
- The status region receives the message exactly once per copy.
- On Android API 33+, no toast is rendered.
- Visual QA: no width jump between "Copy" and "Copied" or "Copiar" and "Copiado", the confirmation sits next to the copied value, and sensitive values do not appear in the Android preview.

## State integrity

- Show "Copied" only after the `writeText` promise resolves.
- expo-clipboard `setStringAsync` always resolves `true` on iOS and Android, so its resolution is the only signal available there.
- Never show success on rejection; show the fallback instead.

## References

- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
- https://developer.android.com/develop/ui/views/touch-and-input/copy-paste
- https://docs.expo.dev/versions/latest/sdk/clipboard/
- https://github.com/github/clipboard-copy-element
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html
- https://api.webstatus.dev/v1/features/popover
- https://api.webstatus.dev/v1/features/starting-style

## Not verified

- Whether TalkBack speaks the Android 13+ system copy confirmation.
- The 1.5 to 2 s "Copied" duration.
- Safari user-activation limits on `writeText` in async code (the Expo docs mention a WebKit issue, not checked at its source).
