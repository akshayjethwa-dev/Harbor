// src/components/plan/PostPlanOptInCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Plan } from "../../types/plan";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  plan: Plan;
}

export default function PostPlanOptInCard({ plan }: Props) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          How was {plan.title}?
        </Text>
        <Text style={styles.emoji}>✨</Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Would you meet anyone again? Your answer is completely private.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => router.push(`/plan/opt-in/${plan.id}` as any)}
      >
        <Text style={[styles.buttonText, { color: colors.textInverse }]}>
          Share your thoughts
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "800", flex: 1 },
  emoji: { fontSize: 22 },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { fontSize: 15, fontWeight: "700" },
});