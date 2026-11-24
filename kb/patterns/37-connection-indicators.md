---
number: 37
name: Connection indicators
classes: [functional-feedback, error-prevention]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
  - https://docs.expo.dev/versions/latest/sdk/network/
  - https://github.com/react-native-netinfo/react-native-netinfo
  - https://web.dev/articles/offline-ux-design-guidelines
  - https://developers.google.com/open-health-stack/design/offline-sync-guideline
  - https://reactnative.dev/docs/accessibilityinfo
  - https://react-spectrum.adobe.com/StatusLight
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (4 corrections applied).
---

# 37. Connection indicators

When losing connectivity changes what the user can do, show a persistent, non-blocking banner that states the consequence. Announce it once, and never base it on navigator.onLine alone.

## Use when

- An offline-capable field app.
- An office web app whose live data may be stale.
- Before actions that truly need the server.

## Avoid when

- Permanent green 'Online' dots everywhere.
- Full-screen 'No connection' modals (web.dev: never block with network modals).
- Banners that flicker on brief blips.
- Styling offline as an error (Open Health Stack guidelines).
- Greying out the whole UI, which reads as disabled (web.dev).

## Web technique

- Place a banner in one consistent location with text and an icon, e.g. 'You're offline. Changes are saved on this device and sent when you reconnect.'
- Detect with online/offline events plus failed requests or a heartbeat: MDN calls navigator.onLine inherently unreliable, and true does not mean internet access.
- Enter with @starting-style and a transition on opacity and transform:translateY, overlaying or reserving space; never animate height.
- Do not disable actions from navigator.onLine or the offline event alone (MDN: only provide hints). Let the user try, then queue the action or fail with an explanation.
- Disable an action, with its reason, only after a real request or heartbeat has failed.

## Native technique

- Use expo-network useNetworkState (SDK 58; on iOS isInternetReachable always equals isConnected), or NetInfo isInternetReachable.
- In NetInfo, null means unknown: treat null as 'checking', not offline.
- Show the banner with a Reanimated FadeIn.
- No haptic: the change is not caused by the user.

## Timing

- Wait about 2–3 s before showing offline, to absorb blips.
- Show 'Back online' for 2–4 s, then collapse.
- Enter in 150–250 ms with an ease-out.
- These figures are guidance, not sourced.

## Accessibility

- Banner text goes in a role=status polite live region that is mounted before any change (WCAG 4.1.3). Do not move focus.
- Reserve assertive for imperative interruptions (MDN).
- Pair color with icon and text (web.dev), with icon contrast of at least 3:1 (WCAG 1.4.11).
- React Native: accessibilityLiveRegion='polite' on Android; on iOS AccessibilityInfo.announceForAccessibilityWithOptions(text, {queue: true}) once per transition, because plain announceForAccessibility interrupts speech already in progress.

## Reduced motion

- The banner appears and disappears instantly, or with an opacity fade only, never a slide.
- The banner text carries the state.

## Keyboard

- The banner is not focusable unless it holds actions.
- A 'Retry now' button responds to Enter and Space.
- Focus is never stolen when the banner appears.

## Performance

- NetInfo's 5 s (unreachable) and 60 s (reachable) re-check timers apply only on platforms without native internet reachability or when useNativeReachability is false.
- Back off your own heartbeats and remove listeners on unmount.
- Call NetInfo.configure once (calling it again stops existing listeners).

## Primitives to reuse

- Web: window online/offline events; React Spectrum StatusLight for inline connection state on a record or device.
- Native: expo-network, @react-native-community/netinfo; build inline state from Text plus an icon.

## Tests

- Automated, with mocked network state: banner text and role=status present; focus unchanged.
- Automated: a blip shorter than the debounce shows nothing; reconnect shows 'Back online'.
- Automated: server-only actions are explained, not silently dead.
- Visual QA: the banner never covers primary actions, does not look like an error, and fits the Spanish copy.

## State integrity

- Do not claim 'Online' or 'Connected' from navigator.onLine or isConnected alone; show 'Connecting…' until a real request succeeds.
- Never show 'All changes saved' while the outgoing queue is non-empty.

## References

- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
- https://docs.expo.dev/versions/latest/sdk/network/
- https://github.com/react-native-netinfo/react-native-netinfo
- https://web.dev/articles/offline-ux-design-guidelines
- https://developers.google.com/open-health-stack/design/offline-sync-guideline

## Not verified

- The MDN aria-live and status role pages, cited for keeping assertive for imperative interruptions, were not opened.
- The timing figures, which have no primary source.
