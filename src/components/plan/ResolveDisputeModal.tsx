// src/components/plan/ResolveDisputeModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { PlanExpense } from "../../types/expense";
import { resolveDispute } from "../../services/expenseService";
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
  card: { backgroundColor: c.bg, borderRadius: 16, padding: 20, maxHeight: "80%" },
  title: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 16 },
  disputeBox: { backgroundColor: c.bgSubtle, padding: 12, borderRadius: 10, marginBottom: 12 },
  disputeReason: { fontSize: 14, fontWeight: "600", color: c.text, marginBottom: 4 },
  disputeMeta: { fontSize: 12, color: c.textSecondary },
  evidenceLink: { fontSize: 12, color: c.primary, marginTop: 4, textDecorationLine: "underline" },
  actionsCol: { gap: 10, marginTop: 16 },
  btn: { padding: 14, borderRadius: 10, alignItems: "center" },
  btnAccept: { backgroundColor: c.success },
  btnReject: { backgroundColor: c.danger },
  btnFalse: { backgroundColor: c.danger + "22", borderWidth: 1, borderColor: c.danger },
  btnEscalate: { backgroundColor: c.warning },
  btnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  btnTextFalse: { color: c.danger, fontWeight: "700", fontSize: 15 },
});

export default function ResolveDisputeModal({ visible, onClose, expense, planId }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [processing, setProcessing] = useState(false);

  if (!expense) return null;
  const pendingDisputes = (expense.disputes || []).filter(d => d.status === "pending");

  const handleAction = async (action: "accept" | "reject" | "escalate" | "reject_false") => {
    setProcessing(true);
    try {
      await resolveDispute(planId, expense.id, action);
      Alert.alert("Success", "Dispute resolved.");
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Resolve Dispute</Text>
          
          <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
            {pendingDisputes.map((d, i) => (
              <View key={i} style={styles.disputeBox}>
                <Text style={styles.disputeReason}>"{d.reason}"</Text>
                <Text style={styles.disputeMeta}>- {d.raisedByName}</Text>
                {d.evidenceUrl && (
                  <Text style={styles.evidenceLink}>{d.evidenceUrl}</Text>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.actionsCol}>
            <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => handleAction("accept")} disabled={processing}>
              <Text style={styles.btnText}>Accept Dispute (Delete Expense)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleAction("reject")} disabled={processing}>
              <Text style={styles.btnText}>Reject Dispute (Keep Expense)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.btnFalse]} onPress={() => handleAction("reject_false")} disabled={processing}>
              <Text style={styles.btnTextFalse}>Reject & Mark as False (Strike User)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, { backgroundColor: "#EEE" }]} onPress={onClose} disabled={processing}>
              <Text style={{ color: "#333", fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}