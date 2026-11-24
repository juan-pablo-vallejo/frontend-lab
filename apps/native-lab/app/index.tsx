import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Heading, Screen } from "../src/components/Screen.tsx";
import { gallery, routeOf } from "../src/gallery.ts";
import { strings } from "../src/strings.ts";
import { borderWidth, color, space, target, type } from "../src/theme.ts";

const headings = {
  pressable: strings.pressable.heading,
  "status-chip": strings.statusChip.heading,
} as const;

function entryOf(component: string, state: string): string {
  const states: Record<string, { entry: string }> =
    component === "pressable" ? strings.pressable.states : strings.statusChip.states;
  return states[state]?.entry ?? state;
}

export default function GalleryIndex() {
  return (
    <Screen testID="gallery-index">
      {gallery.map(({ component, states }) => (
        <View key={component} style={styles.section}>
          <Heading>{headings[component]}</Heading>
          {states.map((state) => (
            <Link key={state} href={routeOf(component, state)} asChild>
              <Pressable
                testID={`entry-${component}-${state}`}
                accessibilityRole="link"
                style={({ pressed }) => [styles.entry, pressed && styles.entryPressed]}
              >
                <Text style={styles.entryText}>{entryOf(component, state)}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space["1"] },
  entry: {
    minHeight: target,
    justifyContent: "center",
    paddingVertical: space["2"],
    borderBottomWidth: borderWidth,
    borderBottomColor: color.border,
  },
  entryPressed: { backgroundColor: color.surfaceRaised },
  entryText: {
    color: color.accent,
    fontSize: type.md.size,
    lineHeight: type.md.lineHeight,
  },
});
