// src/components/discover/CuratedEventCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { Plan } from "../../types/plan";

interface Props {
  plan: Plan;
  onPress: () => void;
}

export default function CuratedEventCard({ plan, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.primary + "10", borderColor: colors.primary }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.badgeRow}>
        <Text style={[styles.label, { color: colors.primary }]}>Harbor Presents</Text>
        <Text style={[styles.capacity, { color: colors.textSecondary }]}>
          {plan.spotsFilled}/{plan.capacity} joined
        </Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{plan.title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {plan.city} • {new Date(plan.startTime.toDate()).toLocaleDateString()}
      </Text>
      {plan.facilitatorUid && (
        <Text style={[styles.facilitator, { color: colors.primary }]}>
          Facilitated by {plan.facilitatorName}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  capacity: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  facilitator: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
});