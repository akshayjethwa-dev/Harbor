// src/components/plan-create/Step4Capacity.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from "react-native";
import { usePlanCreateStore } from "../../store/planCreateStore";
import { CAPACITY_OPTIONS } from "../../constants/activities";

interface Props {
  errors?: Record<string, string>;
}

export default function Step4Capacity({ errors = {} }: Props) {
  const { draft, updateDraft } = usePlanCreateStore();
  const perPerson = draft.capacity > 0 ? Math.round(draft.costTotal / draft.capacity) : 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Capacity & Cost</Text>
      <Text style={styles.label}>How many people can join?</Text>

      <View style={styles.capacityGrid}>
        {CAPACITY_OPTIONS.map((c) => {
          const active = draft.capacity === c.value;
          return (
            <TouchableOpacity
              key={c.value}
              style={[styles.capacityCard, active && styles.capacityCardActive, errors.capacity && styles.inputError]}
              onPress={() => updateDraft({ capacity: c.value })}
            >
              <Text style={[styles.capacityLabel, active && styles.capacityLabelActive]}>
                {c.label}
              </Text>
              <Text style={styles.capacityDesc}>{c.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errors.capacity && <Text style={styles.errorText}>{errors.capacity}</Text>}

      <Text style={styles.label}>Total cost (₹) — 0 for free</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={draft.costTotal === 0 ? "" : String(draft.costTotal)}
        placeholder="0"
        onChangeText={(t) => {
          const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
          updateDraft({ costTotal: isNaN(n) ? 0 : n });
        }}
      />

      {draft.costTotal > 0 && draft.capacity > 0 && (
        <View style={styles.breakdownBox}>
          <Text style={styles.breakdownText}>
            ₹{perPerson} per person ({draft.capacity} people)
          </Text>
        </View>
      )}

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          Paid Plans use Razorpay checkout. Funds are held in escrow until 24h
          after the Plan completes.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A1A", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 12, marginTop: 16 },
  capacityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  capacityCard: {
    width: "47%",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  capacityCardActive: { borderColor: "#E91E63", backgroundColor: "#FFF0F5" },
  capacityLabel: { fontSize: 15, fontWeight: "700", color: "#333" },
  capacityLabelActive: { color: "#E91E63" },
  capacityDesc: { fontSize: 12, color: "#999", marginTop: 3 },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  breakdownBox: {
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 12,
  },
  breakdownText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "700",
    textAlign: "center",
  },
  noteBox: {
    marginTop: 24,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 16,
  },
  noteText: { fontSize: 13, color: "#666", lineHeight: 20 },
  inputError: { borderColor: "#D32F2F" },
  errorText: { color: "#D32F2F", fontSize: 13, marginTop: 8, fontWeight: "600" },
});