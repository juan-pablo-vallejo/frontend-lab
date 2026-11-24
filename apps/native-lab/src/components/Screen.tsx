import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { color, space, type } from "../theme.ts";

/** A scrolling page with the surface colour and the gallery's spacing. */
export function Screen({ testID, children }: { testID: string; children: ReactNode }) {
  return (
    <ScrollView
      testID={testID}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.page}
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  );
}

export function Heading({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}

export function Body({ children, live = false }: { children: string; live?: boolean }) {
  return (
    <Text style={styles.body} accessibilityLiveRegion={live ? "polite" : "none"}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: color.surface },
  content: { padding: space["4"], gap: space["4"] },
  heading: {
    color: color.text,
    fontSize: type.lg.size,
    lineHeight: type.lg.lineHeight,
    fontWeight: "700",
  },
  body: {
    color: color.textMuted,
    fontSize: type.md.size,
    lineHeight: type.md.lineHeight,
  },
});
