---
number: 34
name: Typing indicators
classes: [comprehension, emotional-engagement]
tier: situational
status: researched
date: 2026-11-23
sources:
  - https://mui.com/x/react-chat/behavior/typing-indicators/
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role
  - https://www.nngroup.com/articles/animation-usability/
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
  - https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-reanimated/docs/guides/accessibility.mdx
evidence: Researched from the listed sources on 2026-11-23, then checked against them by two further readers (2 corrections applied).
---

# 34. Typing indicators

Show 'Name is typing…' only in live person-to-person chat, in a fixed slot by the composer. Expire it automatically and announce it politely at most once per episode.

## Use when

- Real-time chat between dispatch and field staff, where knowing a reply is coming prevents duplicate or crossing messages.

## Avoid when

- Asynchronous comments, notes or ticket threads.
- Busy group threads, where it becomes noise.
- AI or system responses (use a status text instead).
- Any indicator not backed by real typing events.

## Web technique

- Render a text label in a fixed-height slot above the composer that is always mounted, empty when idle, so there is no layout shift and the live region already exists.
- Optional dots use CSS keyframes on opacity or transform only.
- Throttle outgoing typing events and expire incoming ones: MUI X Chat has no built-in expiry, so a closed tab can leave the indicator stuck.
- No library is needed.

## Native technique

- Use a Text in a fixed-height View above the input.
- For optional dots, Reanimated withRepeat on opacity.
- No haptic.

## Timing

- A dot cycle of about 1–1.4 s with ease-in-out.
- Show after a few hundred ms of typing.
- Hide 3–5 s after the last signal, and immediately when the message arrives.
- All of these figures are unverified; no source opened gave numbers.

## Accessibility

- Use a polite live region (MUI X uses aria-live='polite'), such as role=status with aria-atomic so the whole phrase is read, not a fragment.
- Keep it out of the tab order (Telerik) and mark the dots aria-hidden.
- Do not re-announce on every change.
- Looping dots that run longer than 5 s beside other content fall under WCAG 2.2.2 (Level A). Stop the dot animation after 5 s and keep the static text, or provide a way to turn it off. The loading-animation exemption covers only phases where no interaction is possible.
- React Native: on Android use accessibilityLiveRegion='polite'. iOS has no live-region prop, so either skip announcements or use AccessibilityInfo.announceForAccessibilityWithOptions with queue:true sparingly.
- Localize plurals ('Ana está escribiendo…', 'Ana y Luis están escribiendo…').

## Reduced motion

- Static text 'Name is typing…' with a static ellipsis and no bouncing dots; the text carries the information.
- In Reanimated an infinite reversed withRepeat does not start under reduce motion and the dots keep their initial value, so initialise them fully visible, never at opacity 0.

## Keyboard

- Not applicable: a non-interactive, non-focusable status.

## Performance

- It is an infinite loop: pause it when the tab is hidden or the screen is unfocused.
- Render at most one per conversation.
- Throttle outgoing typing signals to save radio and battery on field devices.

## Primitives to reuse

- Web: MUI X Chat ChatTypingIndicator (Preview, v9 alpha; it provides a polite live region and a localizable label).
- Native: no core primitive; build it from Text plus Reanimated.

## Tests

- Automated: the indicator appears on a typing event and clears on timeout and on message receipt.
- Automated: the live region exists at mount; English and Spanish plurals are correct; dots are hidden from assistive technology.
- Visual QA: no message-list shift, and no stale indicator after the other user leaves.

## State integrity

- Not applicable.

## References

- https://mui.com/x/react-chat/behavior/typing-indicators/
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role
- https://www.nngroup.com/articles/animation-usability/

## Not verified

- Applying WCAG 2.2.2 to typing dots is a reading of the normative text and its Note 4 on loading animations; no W3C page names this case.
- The Telerik claim that a typing indicator stays out of the tab order.
- The timing figures, which have no primary source.
