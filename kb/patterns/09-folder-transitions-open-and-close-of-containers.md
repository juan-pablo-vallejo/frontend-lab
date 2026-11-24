---
number: 9
name: Folder transitions (open and close of containers)
classes: [comprehension, functional-feedback, navigation]
tier: core
status: researched
date: 2026-11-23
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::details-content
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/interpolate-size
  - https://www.nngroup.com/articles/accordions-complex-content/
  - https://www.nngroup.com/articles/animation-duration/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transition-behavior
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overlay
  - https://bcd.developer.mozilla.org/bcd/api/v0/current/css.properties.transition-behavior.json
  - https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
  - https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (3 corrections applied).
---

# 9. Folder transitions (open and close of containers)

Every expandable container shows its open or closed state at once and accessibly. Motion is
optional: a short height or opacity reveal anchored to the trigger, never one that blocks the
next click.

## Use when

Disclosures, accordions, tree folders, expandable table rows and side panels, where users
need to see where revealed content came from and the content is secondary or loosely related
(NN/g).

## Avoid when

- Users need most of the content: NN/g advises against accordions then; show it all on
  desktop.
- Rows people expand and collapse dozens of times an hour in dense tables: use an instant
  toggle or 120ms or less.
- Any animation that delays focus or the next click.

## Web technique

- Start from native `<details>`/`<summary>` or a `<button aria-expanded>`.
- Animate `::details-content` (Baseline 2025) with opacity plus `content-visibility`
  `allow-discrete` only as progressive enhancement. Firefox does not transition
  `content-visibility` or `display`, and `overlay` is Chromium-only, so closing a details
  and popover or dialog exits are instant there.
- Entry through `@starting-style` (Baseline Aug 2024) works in all current browsers. Do not
  wait on `transitionend` to finish closing.
- Animate height to `auto` only behind `interpolate-size: allow-keywords` (MDN: limited
  availability, experimental), as an enhancement that snaps open elsewhere.
- Prefer opacity and transform (`translateY` a few px, or `scaleY` on a wrapper). Height is a
  layout animation, acceptable only on small isolated regions. Never animate padding,
  margin, top or width on list rows.

## Native technique

Toggle state with `Pressable` and render the content conditionally. Use a Reanimated layout
animation (`FadeIn`/`FadeOut`, `LinearTransition`) only on small regions, and leave
`reduceMotion` at its `ReduceMotion.System` default. Rotate the chevron with transform. No
haptic: Apple HIG warns against overusing haptics, and a disclosure is not a discrete outcome.

## Timing

- Enter 150-250ms with ease-out; exit 100-200ms with ease-in (NN/g: 100-400ms overall, exits
  shorter).
- Material standard easing `cubic-bezier(0.2,0,0,1)`.
- Frequent operational toggles: 0-120ms. No bounce or overshoot.

## Accessibility

- APG disclosure: a button with `aria-expanded` true/false, optional `aria-controls`. Focus
  stays on the trigger; no announcement is needed because `aria-expanded` conveys the state.
- Accordion: each header button is the only child of a heading (h2-h6, or `role=heading`
  with `aria-level`) and sets `aria-controls`. `role=region` panels are optional; avoid them
  above about six panels.
- Tree folders: `role=tree`, `treeitem` and `group`, with `aria-expanded` on parent
  treeitems only, never on end nodes.
- Collapsed content is hidden from assistive technology (`hidden`, `content-visibility` or
  `inert`).
- WCAG 4.1.2 Name, Role, Value; 2.1.1 Keyboard; 2.3.3 Animation from Interactions.
- RN: `accessibilityRole="button"` with `accessibilityState={{expanded}}` (or
  `aria-expanded`).

## Reduced motion

Under `prefers-reduced-motion` and the OS Reduce Motion setting, show or hide instantly
(Reanimated's System default jumps to the end value). The state stays legible without
motion: chevron orientation, `aria-expanded` and the content's presence. An opacity fade of
100ms or less is acceptable because WCAG 2.3.3 does not count pure opacity as motion.

## Keyboard

- Disclosure and accordion headers: Enter and Space toggle; Tab and Shift+Tab move through
  every header and into revealed content. APG lists no arrow keys for accordions.
- Tree folders follow APG Tree View: Right opens a closed node or moves to its first child,
  Left closes it or moves to the parent, Up/Down/Home/End move between nodes.

## Performance

Opacity and transform are compositor-only. Height or `interpolate-size` transitions run
layout every frame and reflow the siblings below; in long lists or virtualized tables that
causes jank and scroll jumps, so animate a wrapper or skip the animation. On mobile, avoid
layout animations inside `FlatList` items while scrolling.

## Primitives to reuse

- Web: native `<details name>` group; Radix Collapsible/Accordion (exposes
  `--radix-collapsible-content-height` for keyframe height animation and follows the APG
  disclosure pattern); React Aria Disclosure.
- Native: Reanimated layout animations. There is no core RN collapsible.

## Tests

- `aria-expanded` flips on click, Enter and Space.
- Collapsed content is not in the accessibility tree and not focusable.
- Focus stays on the trigger.
- Under emulated reduced motion the state changes with zero transition duration.
- Visual QA: no content flash or clipping at start and end, siblings don't jump, the chevron
  matches the state, and a rapid double toggle ends in the correct state.

## State integrity

Not applicable: opening a container is local UI state. If expansion lazy-loads data, show a
loading placeholder inside the container, not an empty open region that looks final.

## References

- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::details-content
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/interpolate-size
- https://www.nngroup.com/articles/accordions-complex-content/
- https://www.nngroup.com/articles/animation-duration/

## Not verified

- Material standard easing `cubic-bezier(0.2,0,0,1)`: confirmed from Material Components
  Android docs and androidx tokens, not from the Material 3 site.
- That Radix Accordion keyframe-height animation is jank-free in virtualized tables: no
  source found.
