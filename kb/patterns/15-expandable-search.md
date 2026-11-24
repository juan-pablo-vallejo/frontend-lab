---
number: 15
name: Expandable search
classes: [navigation, functional-feedback]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.nngroup.com/articles/magnifying-glass-icon/
  - https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
  - https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
  - https://api.webstatus.dev/v1/features/interpolate-size
  - https://web.dev/articles/animations-guide
  - https://docs.expo.dev/versions/latest/sdk/router/stack.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (1 correction applied).
---

# 15. Expandable search

Keep search visible by default; expand from an icon only where width is truly scarce, focusing the input in the same tap so typing is never delayed.

## Use when

Narrow mobile headers, or secondary and rarely used search inside a crowded toolbar.

## Avoid when

- Desktop office screens where search is a primary, repeated action. NN/g finds icon-only search less discoverable and slower: click, wait, sometimes click again.
- Field apps where workers search constantly.
- Any design where the expand animation holds focus or drops the first keystrokes.

## Web technique

- Use `<form role="search">` with `<input type="search">` and a toggle `<button aria-expanded aria-controls>`.
- Call `input.focus()` synchronously in the click handler.
- Expand with an overlay animated by transform/clip-path plus opacity, not width; animating width reflows the whole header every frame.
- `interpolate-size` is Limited (Chromium only), so use it only as progressive enhancement.
- Add a library only if suggestions are needed (combobox).

## Native technique

- Use `TextInput` and call `ref.focus()` or `autoFocus` on press.
- Or use the native header search bar: expo-router `Stack.SearchBar`, rendered in the native header (it forces `headerShown`), or `Stack.Toolbar.SearchBarSlot` in the bottom toolbar on iOS 26+.
- On Android, `@expo/ui` `SearchBar`/`DockedSearchBar` also work.
- Animate a custom container with Reanimated `LinearTransition`.
- No haptic.

## Timing

- Expand in 150 to 200 ms with standard easing `cubic-bezier(0.2,0,0,1)`; collapse in 100 to 150 ms.
- The input must accept keystrokes from frame 0.

## Accessibility

- The toggle has an accessible name ("Search" / "Buscar") with `aria-expanded` and `aria-controls`.
- On expand, focus moves into the input; a search landmark wraps the form.
- Suggestions follow the APG combobox pattern, and result counts are announced through `role=status` (polite).
- WCAG 2.4.3, 2.4.7, 4.1.2 and 4.1.3 apply.
- In RN use `role="searchbox"`, `accessibilityState {expanded}` on the toggle, and `AccessibilityInfo.announceForAccessibility` for counts.

## Reduced motion

The field appears at full width instantly. The caret in the focused input and the toggle's expanded state carry the change.

## Keyboard

- Enter or Space on the toggle expands and focuses the input.
- Esc clears the text first, then collapses and returns focus to the toggle.
- With suggestions, use APG combobox keys: Down/Up, Enter, Esc, Alt+Down.
- An optional `/` shortcut is a character-key shortcut and must satisfy WCAG 2.1.4.

## Performance

A width animation causes layout and reflow of neighbouring header items every frame; prefer an overlay with transform. Debounce server queries. In RN, keep per-keystroke state local so the whole header does not re-render.

## Primitives to reuse

- Web: React Aria `SearchField` with `Autocomplete` or `ComboBox`; the native `input type=search` clear button.
- Native: `TextInput`; expo-router `Stack.SearchBar` and `Stack.Toolbar.SearchBarSlot` (iOS 26+); `@expo/ui` `SearchBar`/`DockedSearchBar` (Compose).

## Tests

- Automated: one click on the toggle leaves `document.activeElement` on the input with `aria-expanded=true`; characters typed immediately after the click all land; Esc collapses and restores focus; the result count appears in the status region.
- Visual QA: no header jitter or wrapping, and the Spanish placeholder fits.

## State integrity

Not applicable.

## References

- https://www.nngroup.com/articles/magnifying-glass-icon/
- https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- https://api.webstatus.dev/v1/features/interpolate-size
- https://web.dev/articles/animations-guide

## Not verified

- The second reader did not re-open the APG combobox page, so the combobox claims here were not re-checked against its text.
