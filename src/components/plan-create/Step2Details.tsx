import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { usePlanCreateStore } from "../../store/planCreateStore";
import { DURATION_OPTIONS } from "../../constants/activities";

// ─────────────────────────────────────────────────────────
// Web-only HTML inputs (rendered via React.createElement)
// React Native Web passes these through to the DOM as-is.
// ─────────────────────────────────────────────────────────
function WebDateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return React.createElement("input", {
    type: "date",
    value,
    min: new Date().toISOString().slice(0, 10),
    onChange: (e: any) => onChange(e.target.value),
    style: {
      width: "100%",
      height: "52px",
      padding: "0 16px",
      fontSize: "16px",
      border: "1.5px solid #E0E0E0",
      borderRadius: "12px",
      backgroundColor: "#FAFAFA",
      color: "#333",
      fontFamily: "inherit",
      boxSizing: "border-box",
      outline: "none",
    },
  });
}

function WebTimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return React.createElement("input", {
    type: "time",
    value,
    onChange: (e: any) => onChange(e.target.value),
    style: {
      width: "100%",
      height: "52px",
      padding: "0 16px",
      fontSize: "16px",
      border: "1.5px solid #E0E0E0",
      borderRadius: "12px",
      backgroundColor: "#FAFAFA",
      color: "#333",
      fontFamily: "inherit",
      boxSizing: "border-box",
      outline: "none",
    },
  });
}

// ─────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────
function toDateStr(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toDisplayDate(d: Date | null): string {
  if (!d) return "Select a date";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Step2Details() {
  const { draft, updateDraft } = usePlanCreateStore();

  // Native date picker state
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  // Temporary values for the picker (before confirming)
  const [tempDate, setTempDate] = useState<Date>(() => {
    if (draft.startDate) return draft.startDate;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });

  const [tempTime, setTempTime] = useState<Date>(() => {
    const d = new Date();
    if (draft.startTime) {
      const [hh, mm] = draft.startTime.split(":").map(Number);
      d.setHours(hh, mm, 0, 0);
    } else {
      d.setHours(18, 30, 0, 0); // Default 6:30 PM
    }
    return d;
  });

  // Native handlers
  const onDateChange = (event: any, selected?: Date) => {
    // On Android, picker dismisses automatically — hide our state
    if (Platform.OS === "android") setShowDate(false);
    if (event.type === "dismissed") return;
    if (selected) {
      setTempDate(selected);
      updateDraft({ startDate: selected });
    }
    if (Platform.OS === "ios") setShowDate(false);
  };

  const onTimeChange = (event: any, selected?: Date) => {
    if (Platform.OS === "android") setShowTime(false);
    if (event.type === "dismissed") return;
    if (selected) {
      setTempTime(selected);
      const hh = String(selected.getHours()).padStart(2, "0");
      const mm = String(selected.getMinutes()).padStart(2, "0");
      updateDraft({ startTime: `${hh}:${mm}` });
    }
    if (Platform.OS === "ios") setShowTime(false);
  };

  // Web handlers
  const handleWebDate = (v: string) => {
    if (!v) {
      updateDraft({ startDate: null });
      return;
    }
    const parsed = new Date(v + "T00:00:00");
    if (!isNaN(parsed.getTime())) {
      updateDraft({ startDate: parsed });
    }
  };

  const handleWebTime = (v: string) => {
    updateDraft({ startTime: v });
  };

  const dateLabel = toDisplayDate(draft.startDate);
  const timeLabel = draft.startTime
    ? (() => {
        const [hh, mm] = draft.startTime.split(":").map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        return d.toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      })()
    : "Select a time";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Details</Text>

      {/* Title */}
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Saturday morning cricket"
        placeholderTextColor="#999"
        value={draft.title}
        onChangeText={(t) => updateDraft({ title: t })}
        maxLength={60}
      />

      {/* Description */}
      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="What should people know?"
        placeholderTextColor="#999"
        value={draft.description}
        onChangeText={(t) => updateDraft({ description: t })}
        multiline
        maxLength={200}
        textAlignVertical="top"
      />

      {/* Date */}
      <Text style={styles.label}>Date</Text>
      {Platform.OS === "web" ? (
        <WebDateInput value={toDateStr(draft.startDate)} onChange={handleWebDate} />
      ) : (
        <>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDate(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerIcon}>📅</Text>
            <Text
              style={
                draft.startDate ? styles.pickerText : styles.pickerPlaceholder
              }
            >
              {dateLabel}
            </Text>
            <Text style={styles.pickerChevron}>›</Text>
          </TouchableOpacity>

          {/* iOS: show inline spinner; Android: native modal */}
          {showDate && (
            <>
              {Platform.OS === "ios" ? (
                <Modal transparent animationType="slide">
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowDate(false)}>
                          <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Date</Text>
                        <TouchableOpacity
                          onPress={() => {
                            updateDraft({ startDate: tempDate });
                            setShowDate(false);
                          }}
                        >
                          <Text style={styles.modalDone}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="spinner"
                        minimumDate={new Date()}
                        onChange={(_, d) => d && setTempDate(d)}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={onDateChange}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Time */}
      <Text style={styles.label}>Start Time</Text>
      {Platform.OS === "web" ? (
        <WebTimeInput value={draft.startTime} onChange={handleWebTime} />
      ) : (
        <>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTime(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerIcon}>🕒</Text>
            <Text
              style={
                draft.startTime ? styles.pickerText : styles.pickerPlaceholder
              }
            >
              {timeLabel}
            </Text>
            <Text style={styles.pickerChevron}>›</Text>
          </TouchableOpacity>

          {showTime && (
            <>
              {Platform.OS === "ios" ? (
                <Modal transparent animationType="slide">
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowTime(false)}>
                          <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Time</Text>
                        <TouchableOpacity
                          onPress={() => {
                            const hh = String(tempTime.getHours()).padStart(
                              2,
                              "0"
                            );
                            const mm = String(tempTime.getMinutes()).padStart(
                              2,
                              "0"
                            );
                            updateDraft({ startTime: `${hh}:${mm}` });
                            setShowTime(false);
                          }}
                        >
                          <Text style={styles.modalDone}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={tempTime}
                        mode="time"
                        display="spinner"
                        is24Hour={false}
                        onChange={(_, d) => d && setTempTime(d)}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="default"
                  is24Hour={false}
                  onChange={onTimeChange}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Duration */}
      <Text style={styles.label}>Duration</Text>
      <View style={styles.chipRow}>
        {DURATION_OPTIONS.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[
              styles.chip,
              draft.durationMinutes === d.value && styles.chipActive,
            ]}
            onPress={() => updateDraft({ durationMinutes: d.value })}
          >
            <Text
              style={[
                styles.chipText,
                draft.durationMinutes === d.value && styles.chipTextActive,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingBottom: 40 },
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
  textArea: { height: 100, paddingTop: 14 },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
    gap: 10,
  },
  pickerIcon: { fontSize: 18 },
  pickerText: { flex: 1, fontSize: 15, color: "#333", fontWeight: "600" },
  pickerPlaceholder: { flex: 1, fontSize: 15, color: "#999" },
  pickerChevron: { fontSize: 22, color: "#CCC" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  chipActive: { borderColor: "#E91E63", backgroundColor: "#FFF0F5" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#666" },
  chipTextActive: { color: "#E91E63" },
  // iOS modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalCancel: { fontSize: 15, color: "#666", fontWeight: "600" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  modalDone: { fontSize: 15, color: "#E91E63", fontWeight: "700" },
});