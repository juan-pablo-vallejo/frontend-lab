import { expect, test } from "@playwright/test";
import { announceChipVerdict, createAnnouncer } from "../src/announce.ts";
import { statusChipStates } from "../src/gallery.ts";
import { strings } from "../src/strings.ts";

// What can be held without a device: which chip states are spoken, and which platform call
// each platform gets. Whether VoiceOver and TalkBack then speak it needs a device.

test("a chip verdict is spoken for saved, sent and attention, never for sending", () => {
  const spoken: string[] = [];
  for (const state of statusChipStates) {
    announceChipVerdict(state, (text) => spoken.push(`${state}: ${text}`));
  }
  expect(spoken).toEqual([
    `saved: ${strings.statusChip.states.saved.announcement}`,
    `sent: ${strings.statusChip.states.sent.announcement}`,
    `attention: ${strings.statusChip.states.attention.announcement}`,
  ]);
});

test("the saved chip names its place, on screen and when spoken", () => {
  const saved = strings.statusChip.states.saved;
  expect(saved.word).toMatch(/on this phone/);
  expect(saved.announcement).toMatch(/on this phone/);
});

test("on iOS the announcer queues behind current speech", () => {
  const calls: unknown[] = [];
  const announce = createAnnouncer({
    os: "ios",
    announceIOS: (text, options) => calls.push(["ios", text, options]),
    showAndroid: (text) => calls.push(["android", text]),
  });
  announce("Sent");
  expect(calls).toEqual([["ios", "Sent", { queue: true }]]);
});

test("on Android the announcer writes into the live region instead", () => {
  const calls: unknown[] = [];
  const announce = createAnnouncer({
    os: "android",
    announceIOS: (text, options) => calls.push(["ios", text, options]),
    showAndroid: (text) => calls.push(["android", text]),
  });
  announce("Sent");
  expect(calls).toEqual([["android", "Sent"]]);
});
