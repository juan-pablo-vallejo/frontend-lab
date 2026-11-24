---
number: 26
name: Charging and status indicators
classes: [comprehension, functional-feedback, error-prevention]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API
  - https://docs.expo.dev/versions/latest/sdk/battery/
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/meter_role
  - https://react-spectrum.adobe.com/StatusLight
  - https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
  - https://docs.expo.dev/versions/latest/sdk/battery.md
  - https://raw.githubusercontent.com/expo/expo/main/packages/expo-battery/src/Battery.ts
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 26. Charging and status indicators

Show status as a static text label with an icon and, where useful, a value. Animate only the change between states; never loop a charging fill in operational screens.

## Use when

- Statuses of jobs, equipment or records (Scheduled, In progress, Blocked) in lists and details.
- Battery of a connected peripheral (scanner, printer).
- A low-battery warning that asks a field worker to sync before a long offline capture.

## Avoid when

- Repeating the phone's own battery indicator.
- Decorative charging animations.
- Color-only status dots.
- Animated status in every table row: motion in peripheral vision slows scanning (NN/g).

## Web technique

- Use text plus an icon with a semantic color, in the style of React Spectrum StatusLight.
- Use native <meter> for levels (MDN prefers it to role=meter).
- Animate state changes with a short CSS transition on color or background-color, or not at all.
- Animate a fill only with transform:scaleX, never width.
- The Battery Status API has Limited availability (MDN; Chromium only per the Expo docs), so feature-detect it and never depend on it.

## Native technique

- Use Text plus an icon.
- Read battery with expo-battery useBatteryLevel, useBatteryState (UNKNOWN, UNPLUGGED, CHARGING, FULL; NOT_CHARGING is Android only) and useLowPowerMode, and handle UNKNOWN and level -1 on unsupported web.
- expo-battery reports only the phone or tablet running the app; a scanner's or printer's level must come from that peripheral's own SDK or protocol.
- useBatteryLevel returns -1 until the first read resolves: show 'unknown', never 'empty' or a low-battery warning.
- Show a non-blocking banner such as 'Battery low: sync now'.
- No haptic.
- If a fill must animate, use Reanimated withTiming on transform scaleX.

## Timing

- Crossfade a state change in 150–250 ms with ease-in-out, or switch instantly.
- Level updates in 300 ms or less with an ease-out.
- No infinite loop.
- These figures are guidance; no source opened gave numbers.

## Accessibility

- A static status is plain text and needs no live region.
- A status that changes at runtime uses role=status. React Spectrum says only one may update at a time; otherwise use a toast.
- A level uses <meter>, or role=meter with aria-valuenow, aria-valuemin, aria-valuemax and aria-valuetext ('Scanner battery 20%, charging') plus a label.
- Icons that carry status need 3:1 contrast (WCAG 1.4.11) and must not rely on color alone.
- React Native's documented role list has progressbar but no meter, so use accessibilityLabel with accessibilityValue {min, max, now, text}.

## Reduced motion

- A charging pulse or fill sweep becomes a static 'Charging' label with a bolt icon and the percentage.
- State changes become instant.

## Keyboard

- Not applicable: the indicator is non-interactive.
- A status that doubles as a filter or button follows the APG button keys (Enter/Space).

## Performance

- A looping indicator in list rows drains the battery it reports.
- iOS level events fire per 1% drop, at most once a minute.
- Android fires only at the system low and okay thresholds, so re-read getBatteryLevelAsync when the app returns to the foreground and before a long capture.
- Do not poll on a short timer.

## Primitives to reuse

- Web: native <meter>, React Spectrum S2 StatusLight.
- Native: expo-battery.
- iOS: SF Symbols variable color, which HIG describes for capacity and strength.

## Tests

- Automated: every state has a visible English and Spanish label.
- Automated: the meter exposes now, min, max and valuetext.
- Automated: a fallback path runs when navigator.getBattery is missing; no animation under reduce motion.
- Visual QA: states stay distinguishable under color-blindness simulation, and icon contrast is at least 3:1.

## State integrity

- For a status the user changes, such as a job status, show the new status marked 'Updating…' until the server confirms, and never style it as final before then.
- On failure, revert to the server value with an explanation.
- Device battery: not applicable.

## References

- https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API
- https://docs.expo.dev/versions/latest/sdk/battery/
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/meter_role
- https://react-spectrum.adobe.com/StatusLight
- https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

## Not verified

- How a peripheral's battery level is obtained (vendor SDK or a Bluetooth battery service); only expo-battery's host-device scope was confirmed.
- expo-battery on unsupported web: the docs page says -1 in its note but 'always returns 1' in the method description.
- The MDN statement that <meter> is preferred to role=meter; the APG meter pattern was opened instead and matches the roles and properties above.
- The NN/g claim that motion in peripheral vision slows scanning.
- The timing ranges, which are guidance with no primary source.
