// app/squad/create.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { createSquad } from "../../src/services/squadService";
import { EMPTY_SQUAD_DRAFT, DAY_NAMES } from "../../src/types/squad";
import { ACTIVITIES, CITIES } from "../../src/constants/activities";
import { markSquadCreated } from "../../src/lib/onboarding"; 
import { announce } from "../../src/lib/a11y"; // ✅ A11y utility

import Button from "../../src/components/common/Button";
import { Spacing, Typography } from "../../src/constants/theme";

export default function CreateSquadScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [draft, setDraft] = useState({ ...EMPTY_SQUAD_DRAFT, city: user?.city ?? "" });
  const [saving, setSaving] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const [citySearch, setCitySearch] = useState("");

  const update = (partial: Partial<typeof draft>) =>
    setDraft((d) => ({ ...d, ...partial }));

  const filteredCities = CITIES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const validate = (): boolean => {
    if (!draft.name.trim()) {
      Alert.alert("Name required", "Give your Squad a name.");
      return false;
    }
    if (!draft.activity) {
      Alert.alert("Activity required", "Pick the main activity for this Squad.");
      return false;
    }
    if (draft.activity === "custom" && !draft.activityCustom.trim()) {
      Alert.alert("Describe the activity", "Say what your Squad does.");
      return false;
    }
    if (!draft.city) {
      Alert.alert("City required", "Pick the city your Squad is based in.");
      return false;
    }
    if (draft.recurringEnabled && draft.recurringDayOfWeek === null) {
      Alert.alert("Pick a day", "Choose the day your Squad meets.");
      return false;
    }
    if (
      draft.recurringEnabled &&
      !/^\d{2}:\d{2}$/.test(draft.recurringTime)
    ) {
      Alert.alert("Time format", "Enter time in HH:MM (e.g., 18:30).");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const squadId = await createSquad(user, draft);
      await markSquadCreated(); 
      
      // ✅ Announce success to screen readers
      announce("Squad created successfully");
      
      router.replace({ pathname: "/squad/[id]", params: { id: squadId } });
    } catch (e: any) {
      Alert.alert("Could not create Squad", e.message ?? "Try again.");
      // ✅ Announce error to screen readers
      announce("Failed to create squad. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Squad</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Squad name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sunday Cricket Crew"
            placeholderTextColor="#999"
            value={draft.name}
            onChangeText={(t) => update({ name: t })}
            maxLength={40}
            accessibilityLabel="Squad name"
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's your Squad about?"
            placeholderTextColor="#999"
            value={draft.description}
            onChangeText={(t) => update({ description: t })}
            multiline
            maxLength={200}
            textAlignVertical="top"
            accessibilityLabel="Description"
          />

          <Text style={styles.label}>Activity</Text>
          <View style={styles.activityGrid}>
            {ACTIVITIES.map((a) => {
              const selected = draft.activity === a.value;
              return (
                <TouchableOpacity
                  key={a.value}
                  style={[styles.activityCard, selected && styles.activityCardActive]}
                  onPress={() => update({ activity: a.value })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Activity: ${a.label}`}
                >
                  <Text style={styles.activityEmoji}>{a.emoji}</Text>
                  <Text
                    style={[
                      styles.activityLabel,
                      selected && styles.activityLabelActive,
                    ]}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {draft.activity === "custom" && (
            <>
              <Text style={styles.label}>Describe your activity</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Board game nights"
                placeholderTextColor="#999"
                value={draft.activityCustom}
                onChangeText={(t) => update({ activityCustom: t })}
                maxLength={30}
                accessibilityLabel="Custom activity description"
              />
            </>
          )}

          <Text style={styles.label}>City</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowCityList(!showCityList)}
            accessibilityRole="button"
            accessibilityLabel="Select city"
          >
            <Text style={draft.city ? styles.inputText : styles.placeholderText}>
              {draft.city || "Select city"}
            </Text>
          </TouchableOpacity>

          {showCityList && (
            <View style={styles.dropdown}>
              <TextInput
                style={styles.search}
                placeholder="Search city..."
                value={citySearch}
                onChangeText={setCitySearch}
                autoFocus
                accessibilityLabel="Search cities"
              />
              {filteredCities.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.cityItem}
                  onPress={() => {
                    update({ city: c });
                    setShowCityList(false);
                    setCitySearch("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${c}`}
                >
                  <Text style={styles.cityText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Recurring pattern</Text>
          <Text style={styles.sectionDesc}>
            Set a recurring schedule so Plans auto-generate for your Squad.
          </Text>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => update({ recurringEnabled: !draft.recurringEnabled })}
            accessibilityRole="switch"
            accessibilityState={{ checked: draft.recurringEnabled }}
            accessibilityLabel="Enable recurring schedule"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Enable recurring</Text>
              <Text style={styles.toggleDesc}>
                Auto-create Plans on a fixed day/time
              </Text>
            </View>
            <View
              style={[styles.switch, draft.recurringEnabled && styles.switchOn]}
            >
              <View
                style={[styles.knob, draft.recurringEnabled && styles.knobOn]}
              />
            </View>
          </TouchableOpacity>

          {draft.recurringEnabled && (
            <>
              <Text style={styles.label}>Day of week</Text>
              <View style={styles.dayRow}>
                {DAY_NAMES.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dayChip,
                      draft.recurringDayOfWeek === i && styles.dayChipActive,
                    ]}
                    onPress={() => update({ recurringDayOfWeek: i })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.recurringDayOfWeek === i }}
                    accessibilityLabel={`Day: ${d}`}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        draft.recurringDayOfWeek === i && styles.dayTextActive,
                      ]}
                    >
                      {d.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="18:30"
                placeholderTextColor="#999"
                value={draft.recurringTime}
                onChangeText={(t) => update({ recurringTime: t })}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Time in hours and minutes"
              />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Create Squad"
            onPress={handleCreate}
            loading={saving}
            disabled={saving}
            style={styles.createBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  closeText: { fontSize: 20, color: "#666", fontWeight: "600" },
  headerTitle: { ...Typography.headline, color: "#1A1A1A" },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  label: {
    ...Typography.subhead,
    fontWeight: "600",
    color: "#333",
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: Spacing.sm,
    height: 52,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
    backgroundColor: "#FAFAFA",
    color: "#333",
    justifyContent: "center",
  },
  inputText: { ...Typography.body, color: "#333" },
  placeholderText: { ...Typography.body, color: "#999" },
  textArea: { height: 100, paddingTop: Spacing.md },
  activityGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  activityCard: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: Spacing.sm,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
    justifyContent: "center",
    alignItems: "center",
  },
  activityCardActive: { borderColor: "#C2185B", backgroundColor: "#FCE4EC" },
  activityEmoji: { fontSize: 26 },
  activityLabel: { ...Typography.caption, fontWeight: "600", color: "#666", marginTop: Spacing.xs },
  activityLabelActive: { color: "#C2185B" },
  dropdown: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: Spacing.sm,
    maxHeight: 180,
    marginTop: Spacing.xs,
  },
  search: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    ...Typography.body,
  },
  cityItem: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  cityText: { ...Typography.body, color: "#333" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: Spacing.xl },
  sectionTitle: { ...Typography.title2, color: "#1A1A1A" },
  sectionDesc: { ...Typography.caption, color: "#666", marginTop: Spacing.xs },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    minHeight: 48, 
  },
  toggleLabel: { ...Typography.subhead, fontWeight: "600", color: "#333" },
  toggleDesc: { ...Typography.caption, color: "#999", marginTop: Spacing.xxs },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E0E0E0",
    padding: 2,
    justifyContent: "center",
  },
  switchOn: { backgroundColor: "#C2185B" },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFF" },
  knobOn: { alignSelf: "flex-end" },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  dayChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
    minHeight: 44,
    justifyContent: "center",
  },
  dayChipActive: { borderColor: "#C2185B", backgroundColor: "#FCE4EC" },
  dayText: { ...Typography.caption, fontWeight: "700", color: "#666" },
  dayTextActive: { color: "#C2185B" },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFF",
  },
  createBtn: {
    width: "100%",
  },
});