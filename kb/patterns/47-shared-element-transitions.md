---
number: 47
name: Shared-element transitions
classes: [comprehension, navigation, decorative]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://react.dev/reference/react/ViewTransition
  - https://unpkg.com/next@16.4.6/dist/docs/01-app/02-guides/view-transitions.md
  - https://developer.chrome.com/docs/web-platform/view-transitions/same-document
  - https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/
  - https://docs.expo.dev/router/advanced/zoom-transition/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:active-view-transition-type
  - https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available
  - https://drafts.csswg.org/css-view-transitions-1/
  - https://unpkg.com/expo@58.0.26/bundledNativeModules.json
  - https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/screens-and-boundaries/
  - https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags/
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 47. Shared-element transitions

Morph an element into its destination only when the same object persists across views and
navigation is occasional. Skip it for rapid record-to-record work, and never let it block
input.

## Use when

A photo or record card opening its detail view, or a search field expanding into search,
where continuity tells users "this is the same thing" (Material container transform; Next.js
guide). It helps most on phones, where the whole screen changes.

## Avoid when

- Users page quickly through records in a dense table or list: every morph adds about 300ms.
- The source is off-screen, or a loading fallback intervenes (React then won't pair the
  elements).
- Names collide.
- During the animation the `::view-transition` overlay captures pointer events, so clicks are
  lost unless you add `::view-transition { pointer-events: none }`. That restores clicks for
  unnamed content only: named participants still skip hit-testing for the whole transition,
  so don't name elements users click rapidly, and keep transitions short.

## Web technique

- React 19.3 ``<ViewTransition name={`item-${id}`} share="…" default="none">`` (exported by
  stable react 19.3.1). Next.js 16.4 App Router activates it on navigation without
  configuration.
- Underneath it uses `view-transition-name` and `document.startViewTransition`
  (same-document Baseline newly available Oct 2025).
- View transition types (`:active-view-transition-type`, `startViewTransition({types})`) are
  Baseline 2026, newly available since Jan 2026. Firefox's first implementation lacked types,
  so feature-detect and fall back to an untyped crossfade on older browsers.
- Add `::view-transition { pointer-events: none }`, keep names unique, and fetch data before
  starting.
- Animate the snapshot's transform and opacity; avoid width/height animations on
  `::view-transition-group`, which run layout every frame.

## Native technique

- Expo SDK 58 installs Reanimated 4.7.1: set `ENABLE_SHARED_ELEMENT_TRANSITIONS` in
  `package.json` `reanimated.staticFeatureFlags` (experimental), or move to 4.8 with
  `react-native-worklets` 0.14.x and rebuild.
- Give both views the same `sharedTransitionTag`, and wrap screens with
  `SharedTransitionBoundary isActive={useIsFocused()}` through Expo Router
  `<Stack screenLayout>`, importing `useIsFocused` from `expo-router`.
- Android and iOS only; the web renders without a transition.
- iOS alternative: Expo Router `Link.AppleZoom` / `Link.AppleZoomTarget` (alpha, iOS 18+,
  SDK 55+).
- No haptic.

## Timing

250-400ms. Material container transform is 300ms in and 250ms out, and NN/g allows up to
about 400ms for large movement. Use Material standard easing `cubic-bezier(0.2,0,0,1)` or a
slow spatial spring without visible overshoot. The return can be shorter.

## Accessibility

- A route change needs a new document title or heading. Move focus to the destination's main
  heading, and on back return focus to the originating item.
- Snapshots are not in the accessibility tree, so the animation announces nothing.
- WCAG 2.3.3, 2.4.3 Focus Order, 2.4.2 Page Titled.
- RN: the native stack handles screen-reader focus; mark the destination title with
  `accessibilityRole="header"`.

## Reduced motion

- Web: React does not handle this itself. Set `::view-transition-group/old/new`
  `animation-duration` to 0 or, better, keep a short crossfade and drop the positional
  movement (Next.js and Chrome guidance).
- Native: Reanimated omits shared transitions under `ReduceMotion.System`.
- The destination heading and the item's image or title carry the continuity in text.

## Keyboard

Not applicable to the motion. Navigation uses normal link activation (Enter) and browser back
(Alt+Left or Cmd+[). The transition must not swallow keystrokes made during it.

## Performance

The old view is a static screenshot and the new view is live. Rendering is frozen while the
update callback's promise is pending, so keep it fast. Only one view transition runs at a
time; starting another skips the current one. Many named elements multiply snapshot memory.
On native, transitions run on the UI thread; avoid large images without fixed dimensions.

## Primitives to reuse

- Web: React `<ViewTransition>`, the browser View Transition API, Next.js App Router
  integration.
- Native: Reanimated `SharedTransitionBoundary` through Expo Router `<Stack screenLayout>`,
  Expo Router `Link.AppleZoom`.

## Tests

- Navigation completes and focus lands on the destination heading, with and without View
  Transition support.
- No duplicate `view-transition-name` exists (`transition.ready` must not reject).
- Clicks during the transition aren't lost.
- Visual QA: the morph starts from the exact source, the aspect ratio doesn't distort, there
  is no flash of the unstyled destination, and back navigation from a browser swipe degrades
  cleanly.

## State integrity

Not applicable for navigation. Don't use a shared-element morph to imply an item was created
or saved (for example morphing a draft into a "saved" detail) before the server confirms.

## References

- https://react.dev/reference/react/ViewTransition
- https://unpkg.com/next@16.4.6/dist/docs/01-app/02-guides/view-transitions.md
- https://developer.chrome.com/docs/web-platform/view-transitions/same-document
- https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/
- https://docs.expo.dev/router/advanced/zoom-transition/

## Not verified

- Material container transform 300ms in / 250ms out: the Material Components Android
  Motion.md table gives it, but the current `MaterialContainerTransform` source maps to
  `motionDurationLong2` / `motionDurationMedium4` (500ms / 400ms in the same doc's token
  table). The Material 3 site was not opened.
- Material standard easing `cubic-bezier(0.2,0,0,1)`: confirmed from Material Components
  Android docs and androidx tokens, not from the Material 3 site.
- That the native stack handles screen-reader focus on route change (VoiceOver and
  TalkBack): no source opened.
- Reanimated 4.7.1 exports `SharedTransitionBoundary` in its type definitions, but the docs
  describe the 4.8 API. Whether the flag-gated 4.7 behaviour matches was not tested.
