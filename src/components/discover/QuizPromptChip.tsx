// src/components/discover/QuizPromptChip.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme/ThemeContext";
import { useVibeQuizStore } from "../../store/vibeQuizStore";

export default function QuizPromptChip() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isCompleted } = useVibeQuizStore();

  if (isCompleted) return null; // Hide if already completed

  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}
      onPress={() => router.push("/onboarding/vibe-quiz" as any)}
      activeOpacity={0.8}
    >
      <Text style={styles.emoji}>✨</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          Improve your picks — take the 60-second quiz
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Help us understand your vibe for better matches.
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  emoji: { fontSize: 24 },
  title: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  sub: { fontSize: 12 },
  chevron: { fontSize: 22, fontWeight: "700" },
});