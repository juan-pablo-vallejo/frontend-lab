---
number: 49
name: Contextual action menus
classes: [navigation, error-prevention]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://developer.apple.com/design/human-interface-guidelines/context-menus
  - https://www.nngroup.com/articles/contextual-menus/
  - https://www.radix-ui.com/primitives/docs/components/context-menu
  - https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-long-press-gesture
  - https://docs.expo.dev/versions/latest/sdk/haptics/
  - https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Element.json
  - https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event
  - https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 49. Contextual action menus

Treat context menus as accelerators: mirror every action in a visible control, keep them short, mark destructive items, and open at the pointer without delay.

## Use when

Per-row actions in tables and lists for experienced users (right-click on desktop, long-press on mobile), as a shortcut alongside a visible "⋯" menu button.

## Avoid when

- As the only path, since gestures are undiscoverable (NN/g, Apple).
- For the primary repeated action: long-press waits 500 ms by default, so make it a visible button.
- For gloved field use.
- Overriding the browser context menu in text fields where users need copy, paste or spellcheck.

## Web technique

- On desktop, open at the pointer from the `contextmenu` event; it also fires for the keyboard context-menu key.
- Safari on iOS does not fire `contextmenu`, so use a library that implements touch long-press (Radix `ContextMenu`, React Aria `trigger="contextMenu"`) and always render the visible menu button with the same items.
- Animate opacity and scale from the pointer using `--radix-context-menu-content-transform-origin`, with the same timing as menus.
- Never animate layout properties.

## Native technique

- iOS: `@expo/ui` `ContextMenu` (SwiftUI) supplies the system preview, motion and haptic; do not add another.
- Android: Compose `DropdownMenu` anchored to the row.
- Custom: RNGH `useLongPressGesture` (`minDuration` 500 ms, `maxDistance` 10 pt) with Reanimated. Fire the haptic when the press is recognized: `performAndroidHapticsAsync(Long_Press)` on Android, `impactAsync(Medium)` on iOS.
- Also expose the same actions as `accessibilityActions` on the row.

## Timing

- Long-press recognition 400 to 500 ms (RNGH default 500).
- The menu enters in 150 ms or less and exits in 100 ms or less; system menus keep their own timing.

## Accessibility

- `role=menu` and `menuitem`. Esc or activation returns focus to the invoking row (APG).
- Destructive items are labelled in text, not by colour alone.
- Sources conflict: Apple says hide unavailable items and omit shortcuts in context menus, while NN/g says disable rather than hide and show shortcuts. Follow the HIG on iOS and NN/g on desktop web.
- In RN, `accessibilityActions` on the row with labels.

## Reduced motion

No scale or blur preview; the menu appears in place. A highlighted row marks the target, which the motion used to convey.

## Keyboard

- Shift+F10 or the Menu key on a focused row opens the menu: the APG Menu and Menubar pattern names Shift+F10 in Windows as the context-menu command, and browsers fire `contextmenu` for the context-menu key.
- A standard macOS key is not verified, so the Tab-reachable menu button stays required.
- Inside: arrows, Enter, Esc, type-ahead.

## Performance

Use one shared menu instance for all rows. Memoize per-row gesture handlers in `FlatList`. Make sure the long-press fails on scroll (`maxDistance`) so scrolling never triggers menus.

## Primitives to reuse

- Web: Radix `ContextMenu`, React Aria `Menu` with `trigger="contextMenu"` or `trigger="longPress"`.
- Native: `@expo/ui` `ContextMenu` (SwiftUI), `DropdownMenu` (Compose), RNGH long press.
- zeego was last published March 2025.

## Tests

- Automated: right-click opens at the pointer; a keyboard path exists; a parity check confirms every context action is also in a visible control; Esc returns focus to the row; scrolling does not open the menu; `accessibilityActions` exist on rows.
- Visual QA: the menu stays on-screen at edges, ordering puts the most frequent action nearest the finger or pointer, no more than about 3 groups.

## State integrity

The menu closes immediately and the target row shows pending. A delete either confirms first or shows Undo before the commit. Do not render a row as removed before the server confirms, unless the undo window and rollback are real.

## References

- https://developer.apple.com/design/human-interface-guidelines/context-menus
- https://www.nngroup.com/articles/contextual-menus/
- https://www.radix-ui.com/primitives/docs/components/context-menu
- https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-long-press-gesture
- https://docs.expo.dev/versions/latest/sdk/haptics/

## Not verified

- Whether macOS has a standard keyboard key for context menus.
- Whether a fixed 500 ms custom long-press should follow the user-adjustable system touch-and-hold duration on Android and iOS.
