// src/components/plan-create/Step1Activity.tsx
import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from "react-native";
import { usePlanCreateStore } from "../../store/planCreateStore";
import { ACTIVITIES } from "../../constants/activities";

interface Props {
  errors?: Record<string, string>;
}

export default function Step1Activity({ errors = {} }: Props) {
  const { draft, updateDraft } = usePlanCreateStore();
  const customInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (errors.activityCustom) {
      customInputRef.current?.focus();
    }
  }, [errors.activityCustom]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>What's the activity?</Text>
      <Text style={styles.subtitle}>Pick the vibe for your Plan</Text>

      <View style={styles.grid}>
        {ACTIVITIES.map((act) => {
          const selected = draft.activity === act.value;
          return (
            <TouchableOpacity
              key={act.value}
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => updateDraft({ activity: act.value })}
            >
              <Text style={styles.emoji}>{act.emoji}</Text>
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {act.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errors.activity && <Text style={styles.errorText}>{errors.activity}</Text>}

      {draft.activity === "custom" && (
        <View style={styles.customBox}>
          <Text style={styles.customLabel}>What are you doing?</Text>
          <TextInput
            ref={customInputRef}
            style={[styles.customInput, errors.activityCustom && styles.inputError]}
            value={draft.activityCustom}
            onChangeText={(t) => updateDraft({ activityCustom: t })}
            maxLength={30}
            placeholder="e.g. Board game night"
            placeholderTextColor="#999"
          />
          {errors.activityCustom && <Text style={styles.errorText}>{errors.activityCustom}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47%",
    aspectRatio: 1.2,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
    justifyContent: "center",
    alignItems: "center",
  },
  cardSelected: { borderColor: "#E91E63", backgroundColor: "#FFF0F5" },
  emoji: { fontSize: 40, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: "700", color: "#666" },
  labelSelected: { color: "#E91E63" },
  customBox: { marginTop: 24 },
  customLabel: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  customInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  inputError: { borderColor: "#D32F2F" },
  errorText: { color: "#D32F2F", fontSize: 13, marginTop: 8, fontWeight: "600" },
});