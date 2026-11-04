// src/components/plan/PostPlanOptInCard.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Plan } from "../../types/plan";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { repeatCuratedEvent } from "../../services/curatedEventService";

interface Props {
  plan: Plan;
}

export default function PostPlanOptInCard({ plan }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [repeating, setRepeating] = useState(false);

  const handleRepeat = async () => {
    if (!user) return;
    setRepeating(true);
    try {
      const newPlanId = await repeatCuratedEvent(plan.id, user);
      router.push(`/plan/${newPlanId}` as any);
    } catch (e: any) {
      alert(e.message || "Could not repeat event.");
    } finally {
      setRepeating(false);
    }
  };

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

      {plan.isCurated && (
        <TouchableOpacity
          style={[styles.repeatBtn, { borderColor: colors.primary }]}
          onPress={handleRepeat}
          disabled={repeating}
        >
          {repeating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.repeatText, { color: colors.primary }]}>
              🔁 Repeat this event next week
            </Text>
          )}
        </TouchableOpacity>
      )}
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
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  button: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  buttonText: { fontSize: 15, fontWeight: "700" },
  repeatBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  repeatText: { fontSize: 15, fontWeight: "700" },
});