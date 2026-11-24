---
number: 41
name: Light and dark mode transitions
classes: [decorative, emotional-engagement, functional-feedback]
tier: rarely-justified
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark
  - https://www.nngroup.com/articles/dark-mode/
  - https://reactnative.dev/docs/appearance
  - https://docs.expo.dev/develop/user-interface/color-themes/
  - https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available
  - https://github.com/pacocoursey/next-themes/issues/385
  - https://github.com/pacocoursey/next-themes/issues/397
  - https://raw.githubusercontent.com/pacocoursey/next-themes/main/next-themes/README.md
  - https://react.dev/reference/react/ViewTransition
  - https://unpkg.com/next@16.4.6/dist/docs/01-app/02-guides/view-transitions.md
  - https://api.webstatus.dev/v1/features/light-dark
  - https://docs.expo.dev/router/migrate/sdk-55-to-56.md
  - https://unpkg.com/expo-router@58.0.32/build/exports.d.ts
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (4 corrections applied).
---

# 41. Light and dark mode transitions

Follow the system appearance and switch themes instantly, with no flash of the wrong theme.
An animated theme transition is decoration; suppress all transitions during the swap.

## Use when

Correct theming always applies: respect the OS setting, and offer Light, Dark and System
choices when the product supports an override. A brief crossfade is defensible only for an
explicit, rare user toggle on the web.

## Avoid when

- Per-element color transitions that fire on theme change: they cause staggered, janky
  repaints.
- Circular-reveal or wipe effects in operational software.
- Animating automatic sunrise or sunset switches mid-task.
- Defaults: NN/g says not to default general audiences to dark. Apple HIG discourages
  app-specific appearance settings while NN/g recommends offering a toggle; these sources
  conflict.

## Web technique

- Set `color-scheme: light dark` on `:root` and use `light-dark()` or
  `prefers-color-scheme` custom properties. `light-dark()` is Baseline newly available May
  2024, Widely available since Nov 2026.
- Set the theme before first paint to avoid a flash. Prefer your own blocking inline script
  in the server-rendered head, or a cookie-driven class on `html`.
- next-themes 0.4.6 still switches themes but has had no release since Mar 2025 and raises a
  React 19.2+ console error about its injected script tag. If kept, add
  `suppressHydrationWarning` on `html` and `disableTransitionOnChange`.
- Default to the instant swap. A manual `document.startViewTransition` for the toggle can be
  interrupted by React-driven view transitions, which Next.js 16.4 enables with no
  configuration. If a crossfade is required, drive the theme through React state inside
  `startTransition` under a `<ViewTransition>`, 200ms or less, disabled under
  `prefers-reduced-motion`.
- Never transition `background-color` or `color` on `*`.

## Native technique

Use `useColorScheme` or `Appearance` with `userInterfaceStyle` `"automatic"` in the Expo app
config (`expo-system-ui` is required on Android dev builds). Use
`Appearance.setColorScheme('light'|'dark'|'auto')` for an in-app override. Re-render with the
new palette, with no animation and no haptic.

## Timing

Instant (0ms) by default. When crossfading on an explicit toggle, 150-200ms linear or
ease-out opacity on the root snapshot only.

## Accessibility

- A three-option control (Light, Dark, System) as a radio group or select, so the state is
  exposed without announcements.
- WCAG 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast and 1.4.1 Use of Color pass in
  both themes. Test with Increase Contrast and Reduce Transparency (Apple HIG).
- RN: `accessibilityRole="radio"` with `accessibilityState={{checked}}`.

## Reduced motion

Same as the default: an instant swap with no crossfade or reveal. The new colors carry the
information, and the selected option in the theme control confirms the choice.

## Keyboard

Standard radio group: Tab into the group, arrow keys move and select, Space selects. A select
element uses its native keys. A single toggle button uses Enter and Space.

## Performance

Color changes are paint, not compositor work, and a whole-page color transition repaints
everything every frame. A view-transition crossfade composites two snapshots and is cheap,
but freezes rendering while the callback runs. On mobile, an instant swap costs the least
battery.

## Primitives to reuse

- Web: CSS `color-scheme`, `light-dark()`, an inline theme script (next-themes
  `ThemeProvider` with the caveat above).
- Native: RN `Appearance` and `useColorScheme`; Expo `userInterfaceStyle` with
  `expo-system-ui`; in Expo Router apps, `ThemeProvider`, `DarkTheme` and `DefaultTheme`
  imported from `expo-router`.

## Tests

- The correct theme is set before hydration: no flash on a cold load with dark OS emulation.
- Computed `transition-duration` is 0 during the switch.
- Both themes meet contrast ratios (axe in both modes).
- Visual QA: no element lags in the old color, images and icons swap correctly, and chart
  and status colors stay distinguishable in both modes.

## State integrity

Not applicable for the visual swap. When the theme preference syncs to the server, apply it
locally at once and keep it on a failed sync; don't revert the UI silently.

## References

- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark
- https://www.nngroup.com/articles/dark-mode/
- https://reactnative.dev/docs/appearance
- https://docs.expo.dev/develop/user-interface/color-themes/
- https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available

## Not verified

- The severity of the next-themes script-tag error is taken from issue reports (#385, #387,
  #397), which say theming still works. Not reproduced.
