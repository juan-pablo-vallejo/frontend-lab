import { StyleSheet, Text, View } from "react-native";
import type { StatusChipState } from "../gallery.ts";
import { chipColors, radius, space, type } from "../theme.ts";

// Each state has its own shape as well as its own colour, so the chip never relies on colour.
// The glyphs are decoration: the chip is read as one element, by its accessibility label.
// The chip is not a live region: whoever changes its state speaks the verdicts (saved, sent,
// needs attention) through src/announce.ts, and says nothing for sending.
const icons: Record<StatusChipState, string> = {
  saved: "✓", // check mark
  sending: "…", // ellipsis
  sent: "✓✓", // two check marks
  attention: "!",
};

export type StatusChipProps = {
  state: StatusChipState;
  /** The word shown beside the icon. */
  word: string;
  /** What a screen reader says: the word, and what it means, in full. */
  accessibilityLabel: string;
  testID?: string;
};

export function StatusChip({ state, word, accessibilityLabel, testID }: StatusChipProps) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={[styles.chip, fills[state]]}
    >
      <Text style={[styles.icon, inks[state]]}>{icons[state]}</Text>
      <Text style={[styles.word, inks[state]]}>{word}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    gap: space["1"],
    paddingHorizontal: space["3"],
    paddingVertical: space["1"],
    borderRadius: radius.full,
  },
  icon: {
    fontSize: type.sm.size,
    lineHeight: type.sm.lineHeight,
    fontWeight: "700",
  },
  // Shrinks so a long word wraps at large text sizes instead of running off the screen.
  word: {
    flexShrink: 1,
    fontSize: type.sm.size,
    lineHeight: type.sm.lineHeight,
    fontWeight: "600",
  },
});

const states = Object.keys(chipColors) as StatusChipState[];
const fills = StyleSheet.create(
  Object.fromEntries(
    states.map((s) => [s, { backgroundColor: chipColors[s].bg }]),
  ) as Record<StatusChipState, { backgroundColor: string }>,
);
const inks = StyleSheet.create(
  Object.fromEntries(states.map((s) => [s, { color: chipColors[s].fg }])) as Record<
    StatusChipState,
    { color: string }
  >,
);
