---
number: 25
name: Avatar stacks
classes: [comprehension, decorative]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://primer.style/product/components/avatar-stack/
  - https://mui.com/material-ui/react-avatar/
  - https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
  - https://reactnative.dev/docs/accessibility
  - https://www.w3.org/TR/wai-aria-1.2/#img
  - https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.88/accessibility.md
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 25. Avatar stacks

Show 2–4 overlapping avatars plus a "+N" count, with a full text list of names for assistive technology. Skip hover-spread and entrance animations in operational software.

## Use when

The question is who is involved (assignees, a crew on a job, watchers or co-editors) and space is tight, as in table cells and cards. Primer says to use it when space is limited.

## Avoid when

- There is room for 4 or fewer avatars: show them unstacked (per Primer).
- Exact names matter at a glance: in a dense table, show initials or names as text.
- Do not animate a spread on hover: it is decorative and moves content under the pointer.

## Web technique

1. A static flex row with a negative inline margin and a 2px ring in the surface colour. Use `<img>` with `width` and `height` set, `loading='lazy'` and `decoding='async'`, and fall back to initials when the image fails (as MUI Avatar does).
2. If "+N" opens the full list, make it a `<button>` that opens a popover or disclosure.
3. No animation; at most a 100–150 ms opacity fade for presence changes. Never animate `margin` or `width` to spread the stack.

## Native technique

A row of core `<Image>` components (or `expo-image` for caching) with initials fallback `View`s, plus a `Pressable` "+N" that opens a sheet or list. No Reanimated and no haptics.

## Timing

Static. If presence changes are animated, fade opacity for 100–150 ms with ease-out.

## Accessibility

- Fully static stack: `role='img'` with an `aria-label` that names the visible people, for example `aria-label="Assigned: <name>, <name> and 3 others"`.
- If "+N" is a button, use `role='group'` with `aria-label` instead: `role='img'` makes its children presentational, so a button inside it is hidden from assistive technology.
- Set the individual images to `alt=''` so they are not read twice, or else give each image the person's name as `alt`.
- The "+N" button needs its own explicit name, such as "Show all 5 assignees", and `aria-expanded`.
- Do not rely on ring colour for status (WCAG 1.4.1); WCAG 1.1.1 and 4.1.2 apply.
- React Native: make the avatars one accessible `View` (`accessible={true}`) with an `accessibilityLabel`; that groups the children on both platforms. `importantForAccessibility='no-hide-descendants'` is Android-only and optional. Render the "+N" `Pressable` as a sibling with `accessibilityRole='button'`, not as a child: on iOS a `Pressable` nested in an accessible container is unreachable by VoiceOver.

## Reduced motion

Nothing moves by default, so there is nothing to replace. If a presence fade exists, show the change instantly and put presence in text in the label ("online").

## Keyboard

Not applicable to a static stack, which is not focusable. An interactive "+N" is a button: Enter or Space opens it, following the APG disclosure pattern. Escape to close and return focus comes from the popover or dialog behaviour, not from the disclosure pattern.

## Performance

The risk is image decoding, not animation. In long lists, use small images at the device pixel ratio, cache them, and avoid layout shift by fixing the avatar size.

## Primitives to reuse

- Web: MUI `AvatarGroup` (`max`, `total`, `renderSurplus`); Radix Avatar (`@radix-ui/react-avatar` 1.3.1, image and fallback); Primer `AvatarStack` (2–4 avatars, `disableExpand`).
- Native: no core primitive; compose `Image` and `View`.

## Tests

- Automated: the container's accessible name lists the visible people and the "and N others" count in the active locale (EN/ES plurals via `Intl.PluralRules`); individual images are hidden from the accessibility tree; "+N" toggles `aria-expanded`.
- Visual QA: rings separate overlapping avatars on light and dark themes, initials fallbacks are legible, and nothing shifts when images load.

## State integrity

Not applicable: the stack displays state and changes none.

## References

- https://primer.style/product/components/avatar-stack/
- https://mui.com/material-ui/react-avatar/
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- https://reactnative.dev/docs/accessibility

## Not verified

- MUI `AvatarGroup` props (`max`, `total`, `renderSurplus`) and its initials fallback.
- `expo-image` (its docs were not opened).
- The title and level of WCAG 4.1.2 were not extracted from the specification.
