// Every word the gallery shows or speaks. The components take theirs through props.

import type { PressableState, StatusChipState } from "./gallery.ts";

export const strings = {
  galleryTitle: "Gallery",
  notFoundTitle: "Not in the gallery",
  notFoundBody: "This gallery has no such state.",
  backToGallery: "Back to the gallery",
  pressable: {
    heading: "Pressable button",
    label: "Add one",
    busyLabel: "Adding one",
    count: (n: number) => `Count: ${n}`,
    states: {
      idle: {
        entry: "Idle",
        note: "Press it: the count goes up by one.",
      },
      pressed: {
        entry: "Pressed look, forced",
        note: "Drawn as if a finger were on it. Pressing it still adds one.",
      },
      disabled: {
        entry: "Disabled",
        note: "Read as unavailable. Pressing it does nothing.",
      },
      busy: {
        entry: "Busy",
        note: "Its label names what it is doing. A second press does nothing until it is done.",
      },
    } satisfies Record<PressableState, { entry: string; note: string }>,
  },
  statusChip: {
    heading: "Status chip",
    states: {
      saved: {
        entry: "Saved on this phone",
        word: "Saved on this phone",
        spoken: "Status: saved on this phone",
        announcement: "Saved on this phone",
        note: "Kept on this phone, not yet sent.",
      },
      sending: {
        entry: "Sending",
        word: "Sending",
        spoken: "Status: sending",
        note: "On its way; the answer has not come back. Not announced: it is not a verdict.",
      },
      sent: {
        entry: "Sent",
        word: "Sent",
        spoken: "Status: sent and received",
        announcement: "Sent",
        note: "The server answered that it has it.",
      },
      attention: {
        entry: "Needs attention",
        word: "Needs attention",
        spoken: "Status: needs attention",
        announcement: "Needs attention",
        note: "Something has to be done before it can be sent.",
      },
    } satisfies Record<
      StatusChipState,
      { entry: string; word: string; spoken: string; announcement?: string; note: string }
    >,
    answer: "Simulate the server's answer",
    answering: "Answering…",
    again: "Back to sending",
  },
} as const;
