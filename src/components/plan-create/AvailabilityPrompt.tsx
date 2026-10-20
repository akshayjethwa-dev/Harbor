// src/components/plan-create/AvailabilityPrompt.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.primary + "15",
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.primary + "44",
    },
    title: {
      fontSize: 15,
      fontWeight: "800",
      color: c.primary,
      marginBottom: 6,
    },
    body: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
      marginBottom: 12,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    buttonText: {
      color: c.textInverse,
      fontWeight: "700",
      fontSize: 14,
    },
  });

interface AvailabilityPromptProps {
  /** Hide the prompt when the user already has saved availability. */
  hasAvailability: boolean;
}

export default function AvailabilityPrompt({
  hasAvailability,
}: AvailabilityPromptProps) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  if (hasAvailability) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>📅 Set your availability first</Text>
      <Text style={styles.body}>
        Tell us when you're generally free so we can suggest plan times that
        work for you — no need to re-enter it for every plan.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/settings/availability" as any)}
      >
        <Text style={styles.buttonText}>Set availability</Text>
      </TouchableOpacity>
    </View>
  );
}