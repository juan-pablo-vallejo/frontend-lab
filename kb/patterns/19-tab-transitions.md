---
number: 19
name: Tab transitions
classes: [navigation, comprehension]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
  - https://www.nngroup.com/articles/tabs-used-right/
  - https://api.webstatus.dev/v1/features/view-transitions
  - https://docs.expo.dev/router/advanced/native-tabs/
  - https://developer.apple.com/design/human-interface-guidelines/playing-haptics
  - https://react.dev/blog/2026/09/09/react-19-3
  - https://nextjs.org/docs/app/guides/view-transitions
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (1 correction applied).
---

# 19. Tab transitions

Swap tab panels instantly or with a crossfade of 150 ms or less; show the selected tab with two cues; never slide whole panels in dense software.

## Use when

Getting the selected-state feedback right is core for any tab set. A moving selection indicator is acceptable when it is fast and the tab row is stable.

## Avoid when

- Sliding or 3D panel transitions, staggered panel content, and animated or auto-advancing indicators (NN/g flags these).
- Tabs themselves are wrong when users must compare content across tabs or when steps are sequential.
- Do not mix navigation tabs and in-page tabs in one control.

## Web technique

- Use the APG tabs pattern: `tablist`, `tab`, `tabpanel`.
- Switch panels without animation, or with an opacity crossfade.
- Move the underline indicator with transform `translateX`/`scaleX`, or with a same-document View Transition giving the indicator a `view-transition-name` (Baseline newly available since 2025-10-14).
- Route tabs in Next.js are links with `aria-current`, not ARIA tabs.
- React's `<ViewTransition>` component is stable from React 19.3 (`import { ViewTransition } from 'react'`). It animates only updates inside `startTransition`, Suspense reveals or `useDeferredValue`. The Next.js App Router supports it with no configuration. On React 19.0 to 19.2 it is not in the stable release, so use the CSS transform indicator there.
- Never animate panel height, left or width.

## Native technique

- App-level tabs: Expo Router `NativeTabs` (`expo-router/native-tabs` on SDK 58) with system motion.
- In-screen tabs: a segmented control (`@expo/ui` `Picker` segmented on SwiftUI, `SegmentedButton` on Compose) for 2 to 4 views, or react-native-tab-view/pager-view when swiping is wanted.
- Swipe pagers conflict with horizontal gestures in forms and tables.
- No added haptic; Expo docs do not mention tab haptics.

## Timing

- Indicator: 150 to 250 ms with standard easing `cubic-bezier(0.2,0,0,1)`.
- Panel: 0 ms, or a crossfade of 150 ms or less.
- No spring overshoot.

## Accessibility

- Use `tablist` with `aria-label` or `labelledby`; each tab has `aria-selected` and `aria-controls`; each `tabpanel` has `aria-labelledby`, and `tabindex=0` if it has no focusable first content.
- Focus stays on the tab. The selection is announced by state, so no live region is needed.
- WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7 and 4.1.2 apply.
- In RN use `accessibilityRole` tablist/tab with `accessibilityState {selected}`.

## Reduced motion

The indicator jumps and the panel swaps instantly. The selected tab keeps two non-motion cues (weight plus underline or fill), so no information is lost. On iOS, `prefersCrossFadeTransitions` means a crossfade should replace any slide.

## Keyboard

- Tab enters on the active tab, and Tab again goes to the panel.
- Left/Right move between tabs and wrap (Up/Down for vertical tablists). Home/End are optional.
- Enter or Space activates under manual activation. Delete is optional for closable tabs.
- Use automatic activation only when panels render without latency; otherwise use manual (APG).

## Performance

An opacity crossfade keeps two panels composited at once. Keep inactive panels mounted but hidden only when their state must persist. Pager views pre-render neighbouring pages, so lazy-load heavy lists per tab to protect memory on low-end phones.

## Primitives to reuse

- Web: Radix `Tabs`, React Aria `Tabs`, Base UI `Tabs` (includes an indicator part).
- Native: Expo Router `NativeTabs`, react-native-tab-view 4.3.5, react-native-pager-view 10.0.3, `@expo/ui` segmented controls.

## Tests

- Automated: exactly one `aria-selected=true`; arrows move focus and wrap; Home/End work; with automatic activation the panel changes on focus; unsaved input in an inactive panel survives a switch.
- Visual QA: two selection cues with sufficient contrast; no page jump when panel heights differ; Spanish labels do not wrap into a second row.

## State integrity

Not applicable. Switching tabs must never discard unsaved edits silently.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- https://www.nngroup.com/articles/tabs-used-right/
- https://api.webstatus.dev/v1/features/view-transitions
- https://docs.expo.dev/router/advanced/native-tabs/
- https://developer.apple.com/design/human-interface-guidelines/playing-haptics

## Not verified

- WCAG 1.4.1 and 1.4.11, as the criteria behind the two selected-tab cues, were not opened; no source here cites them.
