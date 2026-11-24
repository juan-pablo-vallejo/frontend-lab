---
number: 16
name: Notification indicators (badges and dots)
classes: [functional-feedback, navigation, comprehension]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://developer.apple.com/design/human-interface-guidelines/notifications
  - https://mui.com/material-ui/react-badge/
  - https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/BadgeDrawable.md
  - https://www.nngroup.com/articles/indicators-validations-notifications/
  - https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
  - https://raw.githubusercontent.com/callstack/react-native-paper/v5.15.5/src/components/Badge.tsx
  - https://raw.githubusercontent.com/callstack/react-native-paper/main/src/components/Badge.tsx
  - https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - https://raw.githubusercontent.com/react-navigation/react-navigation.github.io/main/versioned_docs/version-7.x/bottom-tab-navigator.md
  - https://docs.expo.dev/router/advanced/native-tabs.md
  - https://docs.expo.dev/versions/latest/sdk/notifications.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 16. Notification indicators (badges and dots)

Put a badge only on the destination that clears it, for unread or actionable items the user owns. Keep the count true, and never make the badge the only signal.

## Use when

- Unread messages, newly assigned jobs or pending approvals on nav items and tabs.
- Unread dots on inbox rows, where visiting the destination clears the count.

## Avoid when

- Numbers that are not notifications, such as totals, dates or scores (Apple HIG forbids this).
- 'New feature' marketing dots, and counts the user cannot clear.
- In-app look-alikes of the OS app-icon badge (HIG).
- Pulsing or bouncing on each increment in dense nav: it slows repeated scanning, and a pulse running more than 5 s runs into WCAG 2.2.2.

## Web technique

- Render the count as text inside the owning link or button, mark the badge visual aria-hidden, and put the count in the host's accessible name.
- Enter and exit with a CSS transition on opacity and transform:scale, using @starting-style for entry (MDN: Baseline 2024). Swap digits instantly.
- Never animate width, height, top or left. Reserve min-width and use tabular-nums so 9→10 causes no layout shift.
- Cap the display at 99+ or 999+ (MUI max, Material maxNumber).
- No library is needed.

## Native technique

- Use an absolutely positioned View/Text over the tab or icon.
- In stable react-native-paper 5.x, Badge fades opacity with RN Animated.timing over 150\*theme.animation.scale ms and does not read reduce motion, so set the theme animation scale to 0 when reduce motion is on.
- Paper 6 (alpha; requires Reanimated >=4.3) uses a Reanimated CSS transition: 150 ms, 0 ms under reduce motion.
- On tab bars use the navigator's badge, not an overlay: React Navigation bottom tabs tabBarBadge (string or number) with tabBarBadgeStyle, or Expo Router NativeTabs.Trigger.Badge from 'expo-router/native-tabs' (SDK 58). Put the count in tabBarAccessibilityLabel.
- App-icon count: expo-notifications setBadgeCountAsync.
- No haptic: badge changes are not user-caused outcomes, and HIG requires a causal link for haptics.

## Timing

- Show and hide in about 100–200 ms (Paper uses 150 ms on opacity) with an ease-out.
- Change digits instantly; never loop.
- Only the 150 ms figure is sourced; the rest of the range is guidance.

## Accessibility

- Hide the badge from assistive technology and include the count in the host's name, e.g. 'Jobs, 3 new'. MUI says the meaning should be part of that element's accessible name.
- WCAG 4.1.3 covers messages about the result of a user action, a waiting state, progress or errors; its cart-count example follows a button press. A server-pushed unread count is outside that definition, so announcing it is optional: use one batched polite role=status only when it matters.
- Never announce a count change as assertive.
- A dot without text needs 3:1 contrast (WCAG 1.4.11).
- On React Native, put an accessibilityLabel with the plural count on the Pressable or tab.
- Material's setContentDescriptionQuantityStringsResource shows that plurals need localization ('1 nuevo' / '3 nuevos').

## Reduced motion

- The badge appears and disappears instantly with no scale.
- The visible count and the host's accessible name carry the information.
- Any pulse that signalled urgency is replaced by static text, e.g. '3 overdue'.

## Keyboard

- Not applicable to the badge itself, because it is non-focusable decoration of a control.
- The host follows its own pattern: Enter on a link, arrow keys inside an APG Tabs pattern.

## Performance

- Compositor-only when limited to opacity and transform.
- A change in digit count can shift layout unless min-width is reserved.
- Throttle and batch realtime count updates so the whole nav does not re-render.
- In long lists render static dots, not animated components per row.

## Primitives to reuse

- Web: MUI Badge (max, showZero, variant='dot', invisible).
- Native: react-native-paper Badge; React Navigation tabBarBadge; Expo Router NativeTabs.Trigger.Badge.
- Android reference: Material BadgeDrawable (maxNumber, quantity-string content descriptions).

## Tests

- Automated: the host's accessible name includes the count with correct English and Spanish plurals.
- Automated: zero hides the badge unless showZero; over max shows '99+'; no announcement on first load.
- Visual QA: dot contrast of at least 3:1, position at 200% text size, no layout shift from 9 to 10, and no motion when reduce motion is on.

## State integrity

- The count should mirror server unread state.
- Decrementing on open may be optimistic, but must revert if mark-read fails.
- Never add locally guessed items to the count.

## References

- https://developer.apple.com/design/human-interface-guidelines/notifications
- https://mui.com/material-ui/react-badge/
- https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/BadgeDrawable.md
- https://www.nngroup.com/articles/indicators-validations-notifications/
- https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

## Not verified

- How VoiceOver and TalkBack expose React Navigation tabBarBadge and Expo Router NativeTabs badges; only the existence of tabBarBadge, tabBarAccessibilityLabel and NativeTabs.Trigger.Badge was confirmed.
- The MUI Badge default max of 99 and a Material setMaxNumber method; only app:maxNumber, app:maxCharacterCount and setContentDescriptionQuantityStringsResource were confirmed.
- The 100–200 ms range beyond Paper's 150 ms: no primary source gives numbers.
