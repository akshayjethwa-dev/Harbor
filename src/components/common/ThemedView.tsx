import React from "react";
import { View, ViewProps } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface Props extends ViewProps {
  variant?: "bg" | "elevated" | "subtle";
}

export default function ThemedView({
  variant = "bg",
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const bg =
    variant === "elevated"
      ? colors.bgElevated
      : variant === "subtle"
      ? colors.bgSubtle
      : colors.bg;
  return <View style={[{ backgroundColor: bg }, style]} {...rest} />;
}