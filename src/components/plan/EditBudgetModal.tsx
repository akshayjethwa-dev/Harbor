// src/components/plan/EditBudgetModal.tsx
import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  planId: string;
  currentBudget: number;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: c.bg, borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 8 },
  desc: { fontSize: 13, color: c.textSecondary, marginBottom: 16 },
  input: {
    backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 16,
    color: c.text, borderWidth: 1, borderColor: c.border, marginBottom: 20,
  },
  row: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border },
  cancelText: { color: c.textSecondary, fontWeight: "700" },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: c.primary },
  saveText: { color: c.textInverse, fontWeight: "700" },
});

export default function EditBudgetModal({ visible, onClose, planId, currentBudget }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [budgetStr, setBudgetStr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setBudgetStr(currentBudget > 0 ? currentBudget.toString() : "");
  }, [visible, currentBudget]);

  const handleSave = async () => {
    const val = parseFloat(budgetStr) || 0;
    if (val < 0) return Alert.alert("Error", "Budget cannot be negative.");

    setSaving(true);
    try {
      await updateDoc(doc(db, "plans", planId), { costTotal: val });
      onClose();
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
          <Text style={styles.title}>Set Plan Budget</Text>
          <Text style={styles.desc}>
            Setting a budget helps the group track expenses and avoid overspending. Set to 0 to remove the budget.
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter amount (₹)"
            placeholderTextColor={styles.desc.color}
            keyboardType="decimal-pad"
            value={budgetStr}
            onChangeText={setBudgetStr}
            autoFocus
          />

          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}