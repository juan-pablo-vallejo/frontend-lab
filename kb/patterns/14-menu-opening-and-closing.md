---
number: 14
name: Menu opening and closing
classes: [functional-feedback, navigation]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
  - https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style
  - https://api.webstatus.dev/v1/features/anchor-positioning
  - https://docs.expo.dev/versions/latest/sdk/ui/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overlay
  - https://api.webstatus.dev/v1/features/transition-behavior
  - https://api.webstatus.dev/v1/features/overlay
  - https://raw.githubusercontent.com/web-platform-dx/web-features/main/features/anchor-positioning.yml.dist
  - https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/anchor-name.json
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 14. Menu opening and closing

Open action menus immediately from their trigger with a brief opacity/scale; move focus to the first item; close faster than they opened and return focus to the trigger.

## Use when

A button exposes 3 to 12 actions or options, such as row overflow, account, export or bulk actions. Every item is also an action the user chose to look for.

## Avoid when

- Site navigation links: use a disclosure nav, not `role=menu`.
- Picking a form value: use select or listbox.
- Only 1 or 2 actions: show inline buttons.
- Primary actions used many times a day: a menu adds two activations per repetition.
- Hover-to-open menus.

## Web technique

- Use a `<button>` with `popovertarget` and `popover="auto"` (Baseline 2025 newly available) for top layer, light dismiss and Esc. The `role=menu` keyboard model still needs JS or a library.
- Animate only opacity and transform (scale 0.95 to 1, translate 4px) from a `transform-origin` at the trigger, using `@starting-style` plus `display` and `overlay` with `transition-behavior: allow-discrete`.
- `overlay` is Limited to Chromium. In Firefox and Safari the fade still runs, but the menu leaves the top layer immediately and can be painted under or clipped by other content. Keep the exit short and optional.
- Core CSS anchor positioning (`anchor-name`, `position-area`, `position-try-fallbacks`) works in Chrome 125+, Safari 26+ and Firefox 147+ (January 2026). webstatus.dev still lists the whole feature as Limited because of later additions. Use it for simple trigger-attached menus with a fallback position; keep library positioning (Radix, React Aria, Base UI) where older browsers or collision handling matter.
- Never animate height, width, top/left, box-shadow blur or per-item staggers.

## Native technique

- Prefer system menus: `@expo/ui` swift-ui `Menu` or `ContextMenu` on iOS, jetpack-compose `DropdownMenu` on Android, and `Stack.Toolbar.Menu` for header actions (SDK 58). These bring platform motion and haptics.
- A custom fallback is a transparent `Modal` with a Reanimated `FadeIn` entering animation.
- Add no haptic: system menus supply their own.

## Timing

- Open in 100 to 150 ms (M3 short2 to short3) with standard-decelerate `cubic-bezier(0,0,0,1)` or emphasized-decelerate `cubic-bezier(0.05,0.7,0.1,1)`.
- Close in 75 to 100 ms with accelerate easing, or instantly.
- Items must accept input from the first frame.

## Accessibility

- The trigger is a button with `aria-haspopup="menu"` and `aria-expanded`.
- The container has `role=menu`; items are `menuitem`, `menuitemcheckbox` or `menuitemradio` with `aria-checked`.
- Disabled items stay focusable with `aria-disabled`.
- No live region is needed.
- WCAG 2.1.1, 2.4.3, 2.4.7 and 4.1.2 apply, plus 1.4.13 if hover opens the menu.
- In RN use `accessibilityRole` menu/menuitem, `accessibilityState {expanded}` on the trigger, `aria-modal` on a custom iOS overlay, and `Modal` `onRequestClose` for Android back.

## Reduced motion

Replace scale/translate with an opacity fade of 100 ms or less, or appear instantly. The menu's attachment to its trigger, the trigger's `aria-expanded` state and an instant chevron swap carry the opened-from relationship that motion conveyed. Reanimated `ReduceMotion.System` jumps to the end state.

## Keyboard

- On the trigger, Enter or Space opens and focuses the first item; optionally Down opens to the first and Up to the last.
- In the menu: Up/Down move (wrap optional), Home/End, Enter activates and closes, Space toggles checkbox/radio items without closing.
- Esc closes and returns focus to the trigger; Tab closes and moves on.
- Type-ahead is optional (APG menu pattern).

## Performance

Compositor-only when limited to opacity and transform. The top layer avoids z-index fights. In large tables use one shared menu instance, not one per row; repositioning on scroll is the main cost. Native system menus run off the JS thread.

## Primitives to reuse

- Web: Radix `DropdownMenu` (2.2.1), React Aria `MenuTrigger`/`Menu` (1.22.1), Base UI `Menu` (1.9.0).
- Native: `@expo/ui` `Menu`/`ContextMenu` (SwiftUI), `DropdownMenu` (Compose), expo-router `Stack.Toolbar.Menu`.
- zeego was last published March 2025; verify maintenance before adopting.

## Tests

- Automated: `aria-expanded` toggles; focus lands on the first item; Esc and outside click close and return focus to the trigger; Tab closes; an activated item fires exactly once and closes the menu; emulated reduced motion leaves no transform transition.
- Visual QA: no flash of an unpositioned menu at 0,0, no clipping at viewport edges, no invisible exiting layer intercepting clicks, long Spanish labels fit.

## State integrity

Not applicable to the menu itself. A `menuitemcheckbox` that persists a server setting follows optimistic-toggle rules: show pending, then revert visibly on failure.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
- https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
- https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style
- https://api.webstatus.dev/v1/features/anchor-positioning
- https://docs.expo.dev/versions/latest/sdk/ui/

## Not verified

- How Firefox and Safari paint a popover exit without `overlay` was reasoned from the MDN `overlay` page and webstatus data, not tested in a browser.
