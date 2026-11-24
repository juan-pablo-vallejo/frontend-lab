import { Link, Stack } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { strings } from "../strings.ts";
import { color, space, target, type } from "../theme.ts";
import { Body, Screen } from "./Screen.tsx";

/** Shown for a state the gallery does not have, with the way back. */
export function NotFound() {
  return (
    <Screen testID="not-found">
      <Stack.Screen options={{ title: strings.notFoundTitle }} />
      <Body>{strings.notFoundBody}</Body>
      <Link href="/" asChild>
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
        >
          <Text style={styles.linkText}>{strings.backToGallery}</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: target, justifyContent: "center", paddingVertical: space["2"] },
  linkPressed: { backgroundColor: color.surfaceRaised },
  linkText: {
    color: color.accent,
    fontSize: type.md.size,
    lineHeight: type.md.lineHeight,
  },
});
