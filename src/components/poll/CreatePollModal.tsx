// src/components/poll/CreatePollModal.tsx
import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Timestamp } from "firebase/firestore";
import { MAX_POLL_SLOTS, MIN_POLL_SLOTS } from "../../types/poll";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

// ─────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────
interface DraftSlot {
  localId: string;
  startAt: Date;
  durationMinutes: number; // 60 / 120 / 180
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (slots: { startAt: Timestamp; endAt: Timestamp }[], timezone: string) => Promise<void>;
  /** When true, warn about overriding the plan's existing date. */
  planHasDate: boolean;
}

const DURATIONS = [60, 120, 180];

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      maxHeight: "90%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: 12,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { fontSize: 20, fontWeight: "800", color: c.text },
    sub: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
    warn: {
      backgroundColor: c.warning + "22",
      padding: 12,
      borderRadius: 10,
      marginTop: 10,
    },
    warnText: { fontSize: 12, color: c.text, lineHeight: 17 },
    scroll: { paddingHorizontal: 20, paddingBottom: 16 },
    slotCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    slotHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    slotLabel: { fontSize: 13, fontWeight: "700", color: c.text },
    removeBtn: { paddingHorizontal: 10, paddingVertical: 4 },
    removeText: { color: c.danger, fontWeight: "700", fontSize: 12 },
    dtRow: { flexDirection: "row", gap: 8 },
    dtBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    dtLabel: { fontSize: 10, color: c.textMuted, fontWeight: "700", textTransform: "uppercase" },
    dtValue: { fontSize: 14, color: c.text, fontWeight: "700", marginTop: 2 },
    durRow: { flexDirection: "row", gap: 6, marginTop: 10 },
    durChip: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    durChipActive: { borderColor: c.primary, backgroundColor: c.primary + "22" },
    durText: { fontSize: 12, fontWeight: "700", color: c.textSecondary },
    durTextActive: { color: c.primary },
    addBtn: {
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: c.border,
      alignItems: "center",
    },
    addBtnText: { color: c.primary, fontWeight: "700", fontSize: 14 },
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    button: {
      flex: 1,
      height: 50,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryBtn: { backgroundColor: c.primary },
    primaryBtnText: { color: c.textInverse, fontWeight: "700", fontSize: 15 },
    ghostBtn: { borderWidth: 1.5, borderColor: c.border },
    ghostBtnText: { color: c.text, fontWeight: "700", fontSize: 15 },
    disabledBtn: { opacity: 0.45 },
  });

export default function CreatePollModal({
  visible,
  onClose,
  onSubmit,
  planHasDate,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [slots, setSlots] = useState<DraftSlot[]>(() => [newDraftSlot()]);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<
    | { localId: string; field: "startAt" | "endAt"; mode: "date" | "time" }
    | null
  >(null);

  const canAdd = slots.length < MAX_POLL_SLOTS;
  const canSubmit = slots.length >= MIN_POLL_SLOTS && !submitting;

  function newDraftSlot(): DraftSlot {
    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(18, 30, 0, 0);
    return { localId: makeId(), startAt: start, durationMinutes: 120 };
  }

  const addSlot = () => setSlots((s) => [...s, newDraftSlot()]);
  const removeSlot = (localId: string) =>
    setSlots((s) => s.filter((x) => x.localId !== localId));
  const setDuration = (localId: string, minutes: number) =>
    setSlots((s) =>
      s.map((x) => (x.localId === localId ? { ...x, durationMinutes: minutes } : x))
    );

  const editingSlot = useMemo(
    () => slots.find((s) => s.localId === editing?.localId) ?? null,
    [slots, editing]
  );

  // ── DateTimePicker handlers ──
  const onPickerChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (!editing || !picked) {
      setEditing(null);
      return;
    }
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.localId !== editing.localId) return slot;
        const target = new Date(slot.startAt);
        if (editing.mode === "date") {
          target.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
        } else {
          target.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
        }
        return { ...slot, startAt: target };
      })
    );
    setEditing(null);
  };

  const doSubmit = async () => {
    if (!canSubmit) return;
    if (planHasDate) {
      const proceed =
        Platform.OS === "web"
          ? // @ts-ignore
            window.confirm(
              "This plan already has a date. Creating a poll overrides it. Continue?"
            )
          : await new Promise<boolean>((resolve) => {
              Alert.alert(
                "Override existing date?",
                "This plan already has a date. Creating a poll overrides it.",
                [
                  { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                  { text: "Continue", onPress: () => resolve(true) },
                ]
              );
            });
      if (!proceed) return;
    }

    try {
      setSubmitting(true);
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const payload = slots.map((s) => {
        const end = new Date(s.startAt.getTime() + s.durationMinutes * 60 * 1000);
        return { startAt: Timestamp.fromDate(s.startAt), endAt: Timestamp.fromDate(end) };
      });
      await onSubmit(payload, timezone);
      setSlots([newDraftSlot()]);
      onClose();
    } catch (e: any) {
      Alert.alert("Couldn't create poll", e?.message ?? "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Create a date poll</Text>
            <Text style={styles.sub}>
              Propose {MIN_POLL_SLOTS}–{MAX_POLL_SLOTS} slots. Members vote Yes/Maybe/No.
            </Text>
            {planHasDate && (
              <View style={styles.warn}>
                <Text style={styles.warnText}>
                  ⚠️ This plan already has a date. Creating a poll will override it
                  once you confirm a slot.
                </Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.scroll}>
            {slots.map((slot, i) => (
              <View key={slot.localId} style={styles.slotCard}>
                <View style={styles.slotHeader}>
                  <Text style={styles.slotLabel}>Slot {i + 1}</Text>
                  {slots.length > MIN_POLL_SLOTS && (
                    <TouchableOpacity
                      onPress={() => removeSlot(slot.localId)}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.dtRow}>
                  <TouchableOpacity
                    style={styles.dtBtn}
                    onPress={() =>
                      setEditing({ localId: slot.localId, field: "startAt", mode: "date" })
                    }
                  >
                    <Text style={styles.dtLabel}>Date</Text>
                    <Text style={styles.dtValue}>
                      {slot.startAt.toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dtBtn}
                    onPress={() =>
                      setEditing({ localId: slot.localId, field: "startAt", mode: "time" })
                    }
                  >
                    <Text style={styles.dtLabel}>Time</Text>
                    <Text style={styles.dtValue}>
                      {slot.startAt.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.durRow}>
                  {DURATIONS.map((d) => {
                    const active = slot.durationMinutes === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.durChip, active && styles.durChipActive]}
                        onPress={() => setDuration(slot.localId, d)}
                      >
                        <Text style={[styles.durText, active && styles.durTextActive]}>
                          {d / 60}h
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {canAdd && (
              <TouchableOpacity style={styles.addBtn} onPress={addSlot}>
                <Text style={styles.addBtnText}>+ Add slot ({slots.length}/{MAX_POLL_SLOTS})</Text>
              </TouchableOpacity>
            )}

            {/* Native DateTimePicker */}
            {editing && editingSlot && (
              <DateTimePicker
                value={editingSlot.startAt}
                mode={editing.mode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onPickerChange}
              />
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.ghostBtn]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryBtn,
                !canSubmit && styles.disabledBtn,
              ]}
              onPress={doSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>Create poll</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}