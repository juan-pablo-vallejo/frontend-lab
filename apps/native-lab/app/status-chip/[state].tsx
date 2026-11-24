import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { announceChipVerdict } from "../../src/announce.ts";
import { NotFound } from "../../src/components/NotFound.tsx";
import { PressableButton } from "../../src/components/PressableButton.tsx";
import { Body, Screen } from "../../src/components/Screen.tsx";
import { StatusChip } from "../../src/components/StatusChip.tsx";
import { isState, type StatusChipState, statusChipStates } from "../../src/gallery.ts";
import { strings } from "../../src/strings.ts";
import { useAnnouncer } from "../../src/useAnnouncer.tsx";

export default function StatusChipRoute() {
  const { state } = useLocalSearchParams<{ state: string }>();
  const { announce, region } = useAnnouncer();
  // The sending route can move its chip to sent and back, to show what is spoken and what not.
  const [answered, setAnswered] = useState(false);
  if (!isState(statusChipStates, state)) return <NotFound />;

  const shown: StatusChipState = state === "sending" && answered ? "sent" : state;
  const text = strings.statusChip.states[shown];
  return (
    <Screen testID={`status-chip-${state}`}>
      <Stack.Screen
        options={{
          title: `${strings.statusChip.heading}: ${strings.statusChip.states[state].entry}`,
        }}
      />
      <StatusChip
        testID="status-chip"
        state={shown}
        word={text.word}
        accessibilityLabel={text.spoken}
      />
      <Body>{text.note}</Body>
      {state === "sending" ? (
        <View>
          <PressableButton
            testID="status-chip-answer"
            label={answered ? strings.statusChip.again : strings.statusChip.answer}
            busyLabel={strings.statusChip.answering}
            onPress={() => {
              const next = !answered;
              setAnswered(next);
              announceChipVerdict(next ? "sent" : "sending", announce);
            }}
          />
        </View>
      ) : null}
      {region}
    </Screen>
  );
}
