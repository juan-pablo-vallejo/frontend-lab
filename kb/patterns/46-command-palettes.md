---
number: 46
name: Command palettes
classes: [navigation, functional-feedback]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
  - https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
  - https://github.com/pacocoursey/cmdk
  - https://react-aria.adobe.com/Menu
  - https://retool.com/blog/designing-the-command-palette
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (1 correction applied).
---

# 46. Command palettes

Add a keyboard-first, filterable command list for heavy desktop users. It opens instantly with the input focused and supplements visible navigation; it never holds the only path to a command.

## Use when

Office staff work in the app all day with many entities and commands: jump to a record by ID or name, run frequent commands, and learn shortcuts shown beside each command.

## Avoid when

- As the sole route to a feature.
- Phone field use without a keyboard: provide a search screen instead.
- Small apps with few commands.
- Evidence is mostly practitioner writing, not controlled studies.

## Web technique

- Use a modal (`<dialog>` `showModal` or Radix `Dialog`) containing the APG combobox with a listbox, with `aria-activedescendant` so DOM focus stays in the input.
- Options: cmdk 1.1.1 (`Command.Dialog` composes Radix `Dialog`; last release published March 2025, so it is a maintenance risk) or React Aria `Autocomplete` with `Menu` or `ListBox` (virtual focus keeps DOM focus in the input).
- Open with opacity plus scale 0.98 to 1 in 150 ms or less, or instantly.
- No stagger.

## Native technique

- Not applicable on phones. Provide a search screen: a modal with `TextInput` `autoFocus` and a `FlatList` of commands and records.
- Hardware-keyboard shortcuts in RN core are not verified for 0.88.
- No haptic.

## Timing

- Open in 0 to 150 ms.
- Results update with each keystroke in under about 100 ms.
- Close instantly.

## Accessibility

- A dialog with an accessible name.
- The input has `role=combobox` with `aria-expanded`, `aria-controls` and `aria-activedescendant`; options sit in a listbox.
- Announce the result count through `role=status` (polite).
- Focus returns to the previous element on close.
- WCAG 2.1.1, 2.1.4 (if any single-key trigger), 2.4.3, 4.1.2 and 4.1.3 apply.
- In RN, a `role=searchbox` input with list items as buttons, and the count announced.

## Reduced motion

The palette appears instantly. The dimmed backdrop and the focused input signal the mode change.

## Keyboard

- Ctrl/Cmd+K toggles. A deliberate browser conflict is acceptable only under the APG criteria: frequent function, alternative path.
- Down/Up move the active option. Enter runs it.
- Esc clears, then closes.
- Backspace on empty goes back up a level (cmdk nested pages).
- Shortcuts appear beside commands.

## Performance

Filtering runs on the main thread, so precompute the command index. Virtualize large result sets. Debounce server lookups and cancel stale requests.

## Primitives to reuse

- Web: cmdk `Command.Dialog`, React Aria `Autocomplete` plus `Menu`/`ListBox`, APG combobox.
- Native: `TextInput` plus `FlatList` inside a `Modal` or formSheet.

## Tests

- Automated: the shortcut opens the palette and focuses the input; filtering is accent-insensitive for Spanish ("camion" matches "camión"); `aria-activedescendant` points to a rendered option; Enter executes exactly once; Esc restores focus.
- Visual QA: the active option is distinct from hover, long Spanish labels truncate cleanly, the empty state shows recents.

## State integrity

For mutating commands, close the palette and show pending on the affected object; report success only after confirmation. Destructive commands need confirmation or an undo window.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- https://github.com/pacocoursey/cmdk
- https://react-aria.adobe.com/Menu
- https://retool.com/blog/designing-the-command-palette

## Not verified

- Hardware-keyboard shortcuts in React Native 0.88 core: the View docs list only Android `focusable` and `tabIndex` and no `onKeyDown`/`onKeyUp` props; no core shortcut API was found, and no third-party library was checked.
- The second reader did not re-open the APG combobox page, so the combobox claims here were not re-checked against its text.
