import { Stack } from "expo-router";
import { strings } from "../src/strings.ts";
import { color } from "../src/theme.ts";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.surface },
        headerTintColor: color.accent,
        headerTitleStyle: { color: color.text },
        contentStyle: { backgroundColor: color.surface },
      }}
    >
      <Stack.Screen name="index" options={{ title: strings.galleryTitle }} />
    </Stack>
  );
}
