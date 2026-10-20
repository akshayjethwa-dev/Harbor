// src/components/plan/DisputeExpenseModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { PlanExpense } from "../../types/expense";
import { raiseDispute } from "../../services/expenseService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  expense: PlanExpense | null;
  planId: string;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: c.bg, borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: "800", color: c.danger, marginBottom: 8 },
  desc: { fontSize: 13, color: c.textSecondary, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: c.textMuted, marginBottom: 6 },
  input: { backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border, marginBottom: 16 },
  row: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border },
  cancelText: { color: c.textSecondary, fontWeight: "700" },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: c.danger },
  saveText: { color: "#FFF", fontWeight: "700" },
});

export default function DisputeExpenseModal({ visible, onClose, expense, planId }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [saving, setSaving] = useState(false);

  if (!expense) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return Alert.alert("Error", "Please provide a reason for the dispute.");
    if (!user) return;

    setSaving(true);
    try {
      await raiseDispute(planId, expense.id, {
        reason: reason.trim(),
        evidenceUrl: evidence.trim() || undefined,
        raisedByUid: user.uid,
        raisedByName: user.name || "Unknown",
      });
      Alert.alert("Dispute Filed", "The organizer has been notified. This expense is now frozen.");
      onClose();
      setReason(""); setEvidence("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Dispute Expense</Text>
          <Text style={styles.desc}>
            You are disputing the expense <Text style={{ fontWeight: "700" }}>"{expense.description}"</Text> for ₹{expense.amount}. This will freeze the expense until the organizer resolves it.
          </Text>
          
          <Text style={styles.label}>Reason for dispute</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="e.g., I already paid for this separately."
            placeholderTextColor={styles.desc.color}
            value={reason}
            onChangeText={setReason}
            multiline
          />

          <Text style={styles.label}>Evidence Link (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Link to screenshot or receipt"
            placeholderTextColor={styles.desc.color}
            value={evidence}
            onChangeText={setEvidence}
            autoCapitalize="none"
          />

          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Submit Dispute</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}