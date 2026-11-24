import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { NotFound } from "../../src/components/NotFound.tsx";
import { PressableButton } from "../../src/components/PressableButton.tsx";
import { Body, Screen } from "../../src/components/Screen.tsx";
import { isState, pressableStates } from "../../src/gallery.ts";
import { strings } from "../../src/strings.ts";

export default function PressableState() {
  const { state } = useLocalSearchParams<{ state: string }>();
  const [count, setCount] = useState(0);
  if (!isState(pressableStates, state)) return <NotFound />;

  const text = strings.pressable.states[state];
  return (
    <Screen testID={`pressable-${state}`}>
      <Stack.Screen options={{ title: `${strings.pressable.heading}: ${text.entry}` }} />
      <Body>{text.note}</Body>
      <View>
        <PressableButton
          testID="pressable-button"
          label={strings.pressable.label}
          busyLabel={strings.pressable.busyLabel}
          disabled={state === "disabled"}
          busy={state === "busy"}
          forcePressed={state === "pressed"}
          onPress={() => setCount((n) => n + 1)}
        />
      </View>
      <Body live>{strings.pressable.count(count)}</Body>
    </Screen>
  );
}
