// src/components/plan/EditPlanSettingsModal.tsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Plan } from "../../types/plan";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  plan: Plan;
}

export default function EditPlanSettingsModal({ visible, onClose, plan }: Props) {
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  const [capacity, setCapacity] = useState(String(plan.capacity || 0));

  useEffect(() => {
    if (visible) setCapacity(String(plan.capacity || 0));
  }, [visible, plan.capacity]);

  const approvedCount = plan.participants?.length ?? 0;

  const handleSave = async () => {
    const newCapacity = parseInt(capacity, 10);
    if (isNaN(newCapacity) || newCapacity < 0) {
      Alert.alert("Invalid capacity", "Please enter a valid number.");
      return;
    }

    // ✅ GUARDRAIL: Never allow capacity to be set below the number of
    //    already-approved attendees. This prevents silent eviction.
    if (newCapacity !== 0 && newCapacity < approvedCount) {
      Alert.alert(
        "Cannot reduce capacity",
        `You have ${approvedCount} approved attendee${
          approvedCount === 1 ? "" : "s"
        }. Please remove attendees first if you want to reduce the capacity to ${newCapacity}.`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        capacity: newCapacity,
        updatedAt: serverTimestamp(),
      };

      // If the new capacity is equal to the number of attendees, mark as full.
      // If it's higher, reopen the plan.
      if (newCapacity > 0) {
        updates.status =
          approvedCount >= newCapacity ? "full" : "open";
      }

      await updateDoc(doc(db, "plans", plan.id), updates);
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Edit Plan Settings
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 20, color: colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Capacity Field */}
            <Text style={[styles.label, { color: colors.text }]}>Max capacity</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {approvedCount} approved attendee{approvedCount === 1 ? "" : "s"} currently.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.bgSubtle,
                },
              ]}
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
              placeholder="0 for unlimited"
              placeholderTextColor={colors.textMuted}
            />
            {parseInt(capacity, 10) > 0 && parseInt(capacity, 10) < approvedCount && (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                Capacity must be at least {approvedCount} (current attendees) or 0 for unlimited.
              </Text>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: saving ? 0.6 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150,150,150,0.15)",
  },
  title: { fontSize: 20, fontWeight: "800" },
  content: { padding: 20, paddingBottom: 32 },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  hint: { fontSize: 13, marginBottom: 12 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  saveBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 16, fontWeight: "700" },
});