// src/components/common/FormError.tsx
import React from "react";
import { Text, StyleSheet, Platform } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface FormErrorProps {
  message?: string;
}

export default function FormError({ message }: FormErrorProps) {
  const { colors } = useTheme();

  if (!message) return null;

  // Web accessibility: role="alert" interrupts screen readers immediately
  const webAccessibilityProps =
    Platform.OS === "web"
      ? ({
          role: "alert",
        } as any)
      : {};

  return (
    <Text
      style={[styles.text, { color: colors.danger }]}
      // Native accessibility: treat as alert
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive" // Interrupts to read error
      {...webAccessibilityProps}
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 8,
  },
});