import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  onPress: () => void;
  label: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function AccessibleButton({
  onPress,
  label,
  accessibilityLabel,
  accessibilityHint,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
}: Props) {
  const { colors } = useTheme();

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
      ? colors.danger
      : colors.bgSubtle;

  const fg = variant === "secondary" ? colors.text : colors.textInverse;
  const borderColor = variant === "secondary" ? colors.borderStrong : bg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: 1.5,
        },
        pressed && { opacity: 0.85 },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      focusable
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.text, { color: fg }, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
  },
});