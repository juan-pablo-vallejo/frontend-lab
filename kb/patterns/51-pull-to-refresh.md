---
number: 51
name: Pull-to-refresh
classes: [functional-feedback, perceived-performance]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://reactnative.dev/docs/refreshcontrol
  - https://developer.android.com/develop/ui/views/touch-and-input/swipe/add-swipe-interface
  - https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior
  - https://www.nngroup.com/articles/response-times-3-important-limits/
  - https://www.w3.org/TR/wai-aria-1.2/#aria-busy
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy
  - https://developer.chrome.com/blog/overscroll-behavior
  - https://raw.githubusercontent.com/web-platform-dx/web-features/main/features/overscroll-behavior.yml
  - https://reactnative.dev/docs/accessibilityinfo
  - https://raw.githubusercontent.com/software-mansion/react-native-gesture-handler/main/packages/docs-gesture-handler/docs/components/wrapped-components.mdx
  - https://developer.apple.com/design/human-interface-guidelines/progress-indicators
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (5 corrections applied).
---

# 51. Pull-to-refresh

Use the platform's native pull-to-refresh on mobile lists that do not update themselves, and always pair it with a visible Refresh control. On desktop web, use a button only.

## Use when

- Top-anchored native mobile lists, such as today's jobs, where data can go stale and users want an explicit fetch.

## Avoid when

- Lists that already update in real time.
- Desktop web.
- Screens with unsaved form input.
- Maps and other non-list views.
- As the only way to refresh (Android guidance; WCAG 2.5.1 for gestures the app itself implements).

## Web technique

- Do not build a custom pull gesture.
- Provide a Refresh button whose label changes to 'Refreshing…' while fetching and stays focusable. Set aria-busy='true' on the list region being updated, not on the button, and report the result in a role=status region.
- Set overscroll-behavior-y: contain on html or body to stop the browser's pull-to-refresh; on inner scrollers it only stops scroll chaining.
- MDN's Limited availability label for overscroll-behavior dates from April 2026 and reflects inconsistent behaviour on scroll containers with no overflow, so short, non-overflowing lists can still chain.
- If a custom pull is unavoidable, animate transform:translateY only.

## Native technique

- Use FlatList or ScrollView with refreshControl={<RefreshControl refreshing onRefresh />}.
- refreshing is controlled, so set it true in onRefresh or the indicator stops at once.
- Style with tintColor and title on iOS, colors on Android, and progressViewOffset under headers.
- Add a header Refresh button.
- When the list is Gesture Handler's FlatList or ScrollView, use the RefreshControl exported by react-native-gesture-handler 3, which has a Native gesture pre-applied so it takes part in gesture recognition.
- Add no haptic of your own.

## Timing

- Keep the spinner for the real fetch, with a minimum of a few hundred ms to avoid a flash (guidance), then show 'Updated 10:42'.
- Fetches over 10 s need progress and a way to cancel (NN/g).

## Accessibility

- Screen-reader and switch users cannot discover or perform the gesture, so the visible Refresh button is required.
- Android's docs ask for the refresh action as an overflow menu item (showAsAction=never), not a button. Either form is a single-pointer alternative for WCAG 2.5.1, and the visible button is this entry's stricter choice.
- WCAG 2.5.1 (Level A) covers gestures implemented by the app, not those of the OS or browser.
- Announce the result ('List updated') without moving focus: accessibilityLiveRegion='polite' on Android and announceForAccessibilityWithOptions queue:true on iOS.
- React Native: the button has accessibilityRole='button' and accessibilityState={{busy}}.

## Reduced motion

- The native control follows the OS.
- Any custom elastic or overshoot motion becomes a static 'Refreshing…' then 'Updated at 10:42' text.

## Keyboard

- The gesture has no keyboard equivalent, so the Refresh button (Enter/Space) is mandatory.
- A browser reload is not a substitute, because it loses state.

## Performance

- RefreshControl runs natively, which beats JS-driven pull animations.
- Keep the list mounted and merge new data instead of refetching and remounting everything.

## Primitives to reuse

- React Native: RefreshControl.
- Android: SwipeRefreshLayout and Compose pull-to-refresh.
- iOS: UIRefreshControl. HIG (Progress indicators, refresh content controls): also update content automatically and do not make people start every update; add a title only when it adds value, such as the time of the last update, never instructions on how to refresh.

## Tests

- Automated: onRefresh calls the fetch; refreshing goes true, then false on both success and failure.
- Automated: on failure the old data stays with an error.
- Automated: the Refresh button triggers the same path and exposes busy.
- Visual QA: the indicator is not hidden under the header, and the last-updated text is visible.

## State integrity

- Keep showing existing data until new data arrives.
- On failure, keep it with 'Couldn't refresh. Showing data from 10:42.'
- Never clear the list, or claim 'Up to date', before the fetch succeeds.

## References

- https://reactnative.dev/docs/refreshcontrol
- https://developer.android.com/develop/ui/views/touch-and-input/swipe/add-swipe-interface
- https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior
- https://www.nngroup.com/articles/response-times-3-important-limits/

## Not verified

- Whether iOS Safari honours overscroll-behavior on html or body for its own pull-to-refresh; only the Chrome article and the web-features status note were opened.
- Whether the native iOS UIRefreshControl plays a haptic.
- The minimum spinner time of a few hundred ms, which is guidance with no primary source.
