# Web platform notes

Dated facts about what browsers, React and Next.js support, so an agent looks them up here before relying on recall.

## Versions

| Package | Version | Date checked | Source                     |
| ------- | ------- | ------------ | -------------------------- |
| react   | 19.3.1  | 2026-11-23   | react 19.3.1, package.json |
| next    | 16.4.5  | 2026-11-23   | next 16.4.5, package.json  |

Baseline terms (from https://webstatus.dev): Widely means in every core browser for 30 months or more; Newly means in every core browser for less than 30 months; Limited means missing from at least one core browser. Each status below was read from `https://api.webstatus.dev/v1/features/<id>`.

## HTML and CSS features

| Feature                               | What it is for                                              | Status                                                                                                                               | Date checked                  | Source                                                                                         |
| ------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `<dialog>`, `showModal()`             | Modal dialog with inertness and Esc built in                | Widely since 2024-09-14                                                                                                              | 2026-11-23                    | https://api.webstatus.dev/v1/features/dialog                                                   |
| `popover`, `popovertarget`            | Non-modal overlay in the top layer with light dismiss       | Newly since 2025-01-27                                                                                                               | 2026-11-23                    | https://api.webstatus.dev/v1/features/popover                                                  |
| `command`, `commandfor`               | Open or close a dialog or popover with no script            | Newly since 2025-12-12                                                                                                               | 2026-11-23                    | https://api.webstatus.dev/v1/features/invoker-commands                                         |
| `<details name>`                      | Exclusive accordion: one open at a time per name            | Newly since 2024-09-03                                                                                                               | 2026-11-23                    | https://api.webstatus.dev/v1/features/details-name                                             |
| `@starting-style`                     | Entry transition from `display: none`                       | Newly since 2024-08-06                                                                                                               | 2026-11-23                    | https://api.webstatus.dev/v1/features/starting-style                                           |
| `transition-behavior: allow-discrete` | Transition discrete properties such as `display`            | Newly since 2024-08-06                                                                                                               | 2026-11-23                    | https://api.webstatus.dev/v1/features/transition-behavior                                      |
| `overlay` in a transition             | Keep a closing element in the top layer until its exit ends | Limited, Chromium only                                                                                                               | 2026-11-23                    | https://api.webstatus.dev/v1/features/overlay                                                  |
| `:user-invalid`, `:user-valid`        | Validity styles that apply only after interaction           | Widely since 2026-05-02                                                                                                              | 2026-11-23                    | https://api.webstatus.dev/v1/features/user-pseudos                                             |
| `field-sizing: content`               | Form field that grows with its content                      | Newly since 2026-06-16                                                                                                               | 2026-11-23                    | https://api.webstatus.dev/v1/features/field-sizing                                             |
| `linear()` easing                     | Piecewise linear easing curves                              | Widely since 2026-06-11                                                                                                              | 2026-11-23                    | https://api.webstatus.dev/v1/features/linear-easing                                            |
| `inert`                               | Remove a subtree from focus and interaction                 | Widely since 2025-10-11                                                                                                              | 2026-11-23                    | https://api.webstatus.dev/v1/features/inert                                                    |
| Scroll-driven animations              | Animation progress tied to scroll position                  | Newly since 2026-10-27                                                                                                               | 2026-11-23                    | https://api.webstatus.dev/v1/features/scroll-driven-animations                                 |
| `<dialog closedby>`                   | Light dismiss for a modal dialog                            | Limited                                                                                                                              | 2026-11-23                    | https://api.webstatus.dev/v1/features/dialog-closedby                                          |
| `appearance: base-select`             | Fully styleable native `<select>`                           | Limited                                                                                                                              | 2026-11-23                    | https://api.webstatus.dev/v1/features/customizable-select                                      |
| `interpolate-size`, `calc-size()`     | Animate to and from `height: auto`                          | Limited, Chromium only                                                                                                               | 2026-11-23                    | https://api.webstatus.dev/v1/features/interpolate-size                                         |
| `popover="hint"`, `interestfor`       | Hover or focus preview popovers                             | Limited                                                                                                                              | 2026-11-23                    | https://api.webstatus.dev/v1/features/popover-hint                                             |
| Anchor positioning                    | Position an element relative to another                     | Limited overall; core properties (`anchor-name`, `position-area`, `position-try-fallbacks`) in Chrome 125+, Safari 26+, Firefox 147+ | from research, not re-checked | https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/anchor-name.json |
| `@starting-style` exits               | Exit motion of `<details>`, dialog and popover              | Entry works in all current browsers; exits run fully only in Chromium                                                                | from research, not re-checked | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overlay                  |

## Scripted animation and view transitions

| Feature                                 | What it is for                                         | Status                  | Date checked | Source                                                 |
| --------------------------------------- | ------------------------------------------------------ | ----------------------- | ------------ | ------------------------------------------------------ |
| `element.animate()`                     | Sequenced, awaitable, reversible animation             | Widely since 2023-03-16 | 2026-11-23   | https://api.webstatus.dev/v1/features/web-animations   |
| Same-document View Transitions          | Animated DOM state changes                             | Newly since 2025-10-14  | 2026-11-23   | https://api.webstatus.dev/v1/features/view-transitions |
| `<ViewTransition>`, `addTransitionType` | React's view-transition component and transition types | Stable, both exported   | 2026-11-23   | react 19.3.1, cjs/react.production.js                  |

## View transitions in Next.js 16 and React

Checked 2026-11-23 in next 16.4.5, `dist/docs/01-app/02-guides/view-transitions.md`, published at https://nextjs.org/docs/app/guides/view-transitions, unless marked otherwise.

- The App Router needs no configuration. `experimental.viewTransition` is no longer documented.
- `<ViewTransition>` animates only updates inside `startTransition`, `<Suspense>` reveals and `useDeferredValue`. Route navigations are transitions; a plain `setState` is not.
- `<Link transitionTypes={[...]}>` attaches a type to a navigation. Browser back and forward carry no type.
- Layouts persist across navigations, so a `<ViewTransition>` in a layout never enters or exits.
- A named `<ViewTransition>` with `default="none"` morphs only through an explicit `share`.
- `::view-transition` captures pointer events unless given `pointer-events: none`. Named participants skip hit-testing for the length of the transition.
- React does not disable view transitions under `prefers-reduced-motion: reduce`. The `::view-transition-old(*)`, `::view-transition-new(*)` and `::view-transition-group(*)` pseudo-elements take the override.
- React starts its own view transition and interrupts others, so `document.startViewTransition` inside a React tree conflicts with it (https://react.dev/reference/react/ViewTransition, from research, not re-checked).

## Content security policy

| Fact                                                                                                                                                                                            | Date checked                  | Source                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| A nonce-based CSP in Next.js requires dynamic rendering: static optimisation and ISR are off, and Partial Prerendering does not work                                                            | 2026-11-23                    | next 16.4.5, dist/docs/01-app/02-guides/content-security-policy.md |
| Base UI renders inline `<style>` (ScrollArea viewport, Select `alignItemWithTrigger`) and an opt-in inline `<script>`; `CSPProvider` takes a nonce, `disableStyleElements` turns the styles off | from research, not re-checked | https://base-ui.com/react/utils/csp-provider.md                    |
| React Aria renders `<style>` from `usePress` and `usePreventScroll`; its nonce comes only from `<meta property="csp-nonce">` or `__webpack_nonce__`                                             | from research, not re-checked | https://unpkg.com/react-aria@3.53.1/dist/private/utils/getNonce.js |

## Focus in dialogs, popovers and menus

Checked 2026-11-23 at https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog and https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using, unless marked otherwise.

| Element                                  | Fact                                                                                                                                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showModal()`                            | Makes the rest of the page inert and focuses the first focusable element, or the element with `autofocus`                                                                                                              |
| `showModal()`                            | Esc closes the modal; with several open, the last one shown                                                                                                                                                            |
| `showModal()`                            | Does not stop Tab from reaching the browser's own interface                                                                                                                                                            |
| `show()`                                 | Opens a non-modal dialog with no Esc handling                                                                                                                                                                          |
| Popover                                  | Not modal and does not trap focus                                                                                                                                                                                      |
| `popovertarget`                          | Popover contents follow the invoker in tab order; Esc returns focus to the invoker; the invoker gets implicit `aria-expanded` and `aria-details`                                                                       |
| Popover opened from script with `source` | Only the tab order is linked; `aria-expanded` is not set                                                                                                                                                               |
| `popover="auto"`                         | Light dismiss and Esc; opening one closes other auto popovers                                                                                                                                                          |
| `popover="manual"`                       | Neither light dismiss nor Esc                                                                                                                                                                                          |
| Menu button pattern                      | Arrows between items, Home, End, Enter or Space, Esc closes and refocuses the button, type-ahead; a popover provides none of it (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/, from research, not re-checked) |
