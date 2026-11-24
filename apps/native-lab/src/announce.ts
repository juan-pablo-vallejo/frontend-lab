// The app's one way to speak a verdict. Plain TypeScript with the platform calls passed in, so
// the tests can hold the policy without React Native; src/useAnnouncer.tsx wires the real ones.
//
// iOS: VoiceOver speaks `announceForAccessibilityWithOptions`, queued behind current speech.
// Android: the text is written into a view with `accessibilityLiveRegion="polite"`, which
// TalkBack speaks on change. React Native 0.88's `announceForAccessibilityWithOptions` ignores
// its options on Android and sends an announcement event that newer Android versions deprecate,
// so it is not used there.

import type { StatusChipState } from "./gallery.ts";
import { strings } from "./strings.ts";

export type Announce = (text: string) => void;

export type AnnouncerPlatform = {
  os: string;
  announceIOS: (text: string, options: { queue: boolean }) => void;
  showAndroid: (text: string) => void;
};

export function createAnnouncer({
  os,
  announceIOS,
  showAndroid,
}: AnnouncerPlatform): Announce {
  return (text) => {
    if (os === "android") showAndroid(text);
    else announceIOS(text, { queue: true });
  };
}

/**
 * Speaks a chip's state when it is a verdict: saved on this phone, sent, needs attention.
 * Sending is a state in progress and is not spoken.
 */
export function announceChipVerdict(state: StatusChipState, announce: Announce): void {
  const entry = strings.statusChip.states[state];
  if ("announcement" in entry) announce(entry.announcement);
}
