import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/colors";

/**
 * Usage:
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = (c: ThemeColors) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T
): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}