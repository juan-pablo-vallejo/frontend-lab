import { type ReactNode, useMemo, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from "react-native";
import { type Announce, createAnnouncer } from "./announce.ts";

/**
 * The announcer for one screen. Render `region` once on the screen: on Android it is the live
 * region the text is written into; on iOS it is nothing.
 */
export function useAnnouncer(): { announce: Announce; region: ReactNode } {
  // `n` changes on every announcement, so the same words twice are still a change.
  const [android, setAndroid] = useState({ text: "", n: 0 });
  const announce = useMemo(
    () =>
      createAnnouncer({
        os: Platform.OS,
        announceIOS: (text, options) =>
          AccessibilityInfo.announceForAccessibilityWithOptions(text, options),
        showAndroid: (text) => setAndroid(({ n }) => ({ text, n: n + 1 })),
      }),
    [],
  );
  const region =
    Platform.OS === "android" ? (
      <View accessibilityLiveRegion="polite" style={styles.hidden}>
        <Text key={android.n}>{android.text}</Text>
      </View>
    ) : null;
  return { announce, region };
}

// Kept in the accessibility tree but out of sight: the chip already shows the words.
const styles = StyleSheet.create({
  hidden: { position: "absolute", width: 1, height: 1, overflow: "hidden" },
});
