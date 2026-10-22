import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useProfileStore } from "../../store/profileStore";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function StepBasicInfo() {
  const { data, updateData } = useProfileStore();

  const handleAge = (text: string) => {
    const age = parseInt(text.replace(/[^0-9]/g, ""), 10);
    updateData({ age: isNaN(age) ? null : Math.min(age, 99) });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about yourself</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor="#999"
        value={data.name}
        onChangeText={(text) => updateData({ name: text })}
        maxLength={30}
      />

      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        placeholder="Your age (must be 18+)"
        placeholderTextColor="#999"
        keyboardType="number-pad"
        value={data.age?.toString() || ""}
        onChangeText={handleAge}
        maxLength={2}
      />
      {data.age !== null && data.age < 18 && (
        <Text style={styles.errorText}>Must be 18+ to use Kithra</Text>
      )}

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.value}
            style={[
              styles.genderOption,
              data.gender === g.value && styles.genderOptionActive,
            ]}
            onPress={() => updateData({ gender: g.value as any })}
          >
            <Text
              style={[
                styles.genderText,
                data.gender === g.value && styles.genderTextActive,
              ]}
            >
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A1A", marginBottom: 24 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  errorText: { color: "#FF3B30", fontSize: 13, marginTop: 6 },
  genderRow: { flexDirection: "row", gap: 10 },
  genderOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  genderOptionActive: { borderColor: "#E91E63", backgroundColor: "#FFF0F5" },
  genderText: { fontSize: 15, fontWeight: "600", color: "#666" },
  genderTextActive: { color: "#E91E63" },
});