import React from "react";
import { Text, TextProps } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface Props extends TextProps {
  variant?: "primary" | "secondary" | "muted" | "inverse" | "accent";
}

export default function ThemedText({
  variant = "primary",
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const color =
    variant === "secondary"
      ? colors.textSecondary
      : variant === "muted"
      ? colors.textMuted
      : variant === "inverse"
      ? colors.textInverse
      : variant === "accent"
      ? colors.primary
      : colors.text;
  return <Text style={[{ color }, style]} {...rest} />;
}