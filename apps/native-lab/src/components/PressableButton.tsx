import { Pressable, StyleSheet, Text } from "react-native";
import { borderWidth, color, palette, radius, space, target, type } from "../theme.ts";

export type PressableButtonProps = {
  /** What the button does, shown when it is idle. */
  label: string;
  /** What the button is doing, shown while `busy`: it names the act. */
  busyLabel: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * While true, a press does nothing and the busy state is exposed. The button stays
   * enabled so it keeps screen-reader focus.
   */
  busy?: boolean;
  /** Draws the pressed look without a touch, for the gallery's screenshot of it. */
  forcePressed?: boolean;
  testID?: string;
};

export function PressableButton({
  label,
  busyLabel,
  onPress,
  disabled = false,
  busy = false,
  forcePressed = false,
  testID,
}: PressableButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={() => {
        if (!busy) onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        disabled && styles.disabled,
        !disabled && !busy && (pressed || forcePressed) && styles.pressed,
      ]}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {busy ? busyLabel : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: target,
    minWidth: target,
    paddingHorizontal: space["4"],
    paddingVertical: space["2"],
    borderRadius: radius.md,
    borderWidth,
    borderColor: color.accent,
    backgroundColor: color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    backgroundColor: palette.accent["700"],
    borderColor: palette.accent["700"],
  },
  disabled: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
  },
  label: {
    color: color.onAccent,
    fontSize: type.md.size,
    lineHeight: type.md.lineHeight,
    fontWeight: "600",
    textAlign: "center",
  },
  labelDisabled: {
    color: color.textMuted,
  },
});
