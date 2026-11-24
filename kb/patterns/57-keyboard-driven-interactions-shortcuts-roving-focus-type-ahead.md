---
number: 57
name: Keyboard-driven interactions (shortcuts, roving focus, type-ahead)
classes: [navigation, functional-feedback]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
  - https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html
  - https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
  - https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
  - https://reactnative.dev/docs/accessibility
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-keyshortcuts
  - https://www.w3.org/TR/wai-aria-1.2/
  - https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 57. Keyboard-driven interactions (shortcuts, roving focus, type-ahead)

Give each composite widget one tab stop with arrow-key roving focus and type-ahead. Global shortcuts supplement visible controls; single-key shortcuts must be remappable, switchable off, or focus-scoped.

## Use when

Data grids, lists, toolbars, menus and tabs in the office web app. Repetitive data entry. Shortcuts for the top handful of frequent actions.

## Avoid when

- Global single-character shortcuts on pages with text entry (WCAG 2.1.4).
- Overriding OS, browser or assistive-technology keys.
- Shortcuts as the only path.
- Touch-only field phones, where this does not apply.

## Web technique

- Use native elements first.
- For composites, use roving tabindex (DOM focus moves and the browser scrolls the item into view) or `aria-activedescendant` (combobox, listbox).
- Use a visible focus indicator distinct from selection and avoid animating it. Add `scroll-padding` so sticky headers do not hide focus.
- Expose shortcuts visibly on the control (tooltip or menu hint) and declare them with the global `aria-keyshortcuts` attribute (WAI-ARIA 1.2). `aria-keyshortcuts` only declares a shortcut and does not implement it, and screen reader support for announcing it is not verified.
- Libraries: React Aria collections (typeahead built in), Radix primitives.

## Native technique

- Mostly not applicable to field phones.
- Use `accessibilityActions` plus iOS `magicTap`/`escape` for screen-reader efficiency.
- Hardware-keyboard shortcuts and focus order on tablets are not verified for RN 0.88 core.
- No haptic.

## Timing

- Focus moves instantly (0 ms).
- Highlight changes take 100 ms or less, or none.
- The type-ahead buffer reset of about 500 ms is a common convention, not verified in APG.

## Accessibility

- Focus is always visible and distinct from selection, and never falls to body after a delete or close (APG).
- Disabled menu items remain focusable with `aria-disabled`.
- WCAG 2.1.1, 2.1.4, 2.4.3, 2.4.7, 2.4.11 and 2.1.2 apply.
- 2.1.2 No Keyboard Trap: focus moved into a component by keyboard must be movable away by keyboard alone. Modal focus containment passes when Esc or a Close control exits; any non-standard exit method must be told to the user.
- In RN, use `accessibilityActions` and `onAccessibilityEscape`.

## Reduced motion

No motion is involved. Any smooth scrolling into view becomes instant scrolling.

## Keyboard

- Tab/Shift+Tab between widgets. Arrows within a widget; Home/End; Enter/Space activate; Esc cancels or closes; a printable character jumps to the next item starting with it.
- Choose shortcuts that avoid modifier+Tab/Enter/Space/Esc, Meta plus a single key, Alt plus function keys, Caps Lock/Insert/Scroll Lock combinations, and Ctrl+Option on macOS (APG).

## Performance

Delegate keydown handling to the container. With roving tabindex, avoid re-rendering the whole list on focus change by memoizing rows. `scrollIntoView` with `block:'nearest'` prevents jumpy scrolling.

## Primitives to reuse

- Web: React Aria hooks and collections (`FocusScope`, typeahead), Radix roving-focus primitives, native select and listbox behaviours.
- Native: core `accessibilityActions`.

## Tests

- Automated: one tab stop per composite; arrows, Home and End move focus; type-ahead handles accented initials (Á, É, Ñ); shortcuts do not fire while typing in inputs; a setting disables single-key shortcuts; focus lands on a sensible element after delete or close.
- Visual QA: the focus ring is visible in light, dark and forced-colors modes and is never fully hidden under sticky headers.

## State integrity

Not applicable on its own. A shortcut-triggered mutation follows the same pending and confirmed rules as its button.

## References

- https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html
- https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
- https://reactnative.dev/docs/accessibility

## Not verified

- Hardware-keyboard shortcuts in React Native 0.88 core: the View docs list only Android `focusable` and `tabIndex` and no `onKeyDown`/`onKeyUp` props; no core shortcut API was found, and no third-party library was checked.
- The type-ahead buffer reset of about 500 ms remains unconfirmed in APG.
- The `focusgroup` attribute exists only in Chromium 150+ (Limited on webstatus.dev).
