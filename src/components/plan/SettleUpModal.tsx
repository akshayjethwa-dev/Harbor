// src/components/plan/SettleUpModal.tsx
import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Linking, ActivityIndicator } from "react-native";
import { Settlement } from "../../types/expense";
import { GarbaCrewUser } from "../../types/user";
import { getUserProfile } from "../../services/userService";
import { recordSettlement } from "../../services/settlementService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  settlement: Settlement | null;
  planId: string;
  onSettled: () => void;
}

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const UPI_LIMIT = 100000;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: c.bg, borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 8 },
  desc: { fontSize: 14, color: c.textSecondary, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: c.textMuted, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 16, color: c.text, borderWidth: 1, borderColor: c.border },
  warning: { color: c.danger, fontSize: 12, marginTop: 8, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10, marginTop: 20 },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
  btnPrimary: { backgroundColor: c.primary },
  btnPrimaryText: { color: c.textInverse, fontWeight: "800", fontSize: 15 },
  btnGhost: { borderWidth: 1, borderColor: c.border },
  btnGhostText: { color: c.textSecondary, fontWeight: "700", fontSize: 15 },
});

export default function SettleUpModal({ visible, onClose, settlement, planId, onSettled }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [payee, setPayee] = useState<GarbaCrewUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (visible && settlement) {
      setAmountStr(settlement.amount.toString());
      setLoading(true);
      getUserProfile(settlement.toUid).then(u => { setPayee(u); setLoading(false); });
    }
  }, [visible, settlement]);

  if (!settlement) return null;

  const currentAmount = parseFloat(amountStr) || 0;
  const exceedsLimit = currentAmount > UPI_LIMIT;
  const upiId = payee?.upiId || "";
  const hasValidUpi = UPI_REGEX.test(upiId);

  const handlePayUPI = async () => {
    if (!hasValidUpi) return Alert.alert("Invalid UPI", "The payee has not set a valid UPI ID.");
    if (exceedsLimit) return Alert.alert("Limit Exceeded", "UPI limit is ₹1,00,000. Please split the payment.");

    const url = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payee?.name || "")}&am=${currentAmount}&cu=INR&tn=${encodeURIComponent("Harbor Settlement")}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("No UPI App", "No UPI app found. Please pay manually.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not open UPI app.");
    }
  };

  const handleMarkSettled = async (method: "upi" | "manual") => {
    setProcessing(true);
    try {
      await recordSettlement(planId, settlement.fromUid, settlement.fromName, settlement.toUid, settlement.toName, currentAmount, method);
      onSettled();
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
          <Text style={styles.title}>Settle Up</Text>
          <Text style={styles.desc}>
            Pay <Text style={{ fontWeight: "700" }}>{settlement.toName}</Text>
          </Text>

          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput 
            style={styles.input} 
            value={amountStr} 
            onChangeText={setAmountStr} 
            keyboardType="decimal-pad"
          />
          {exceedsLimit && (
            <Text style={styles.warning}>⚠️ UPI limit is ₹1,00,000. Please split into multiple payments.</Text>
          )}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : (
            <>
              <Text style={styles.label}>Payee UPI ID</Text>
              {hasValidUpi ? (
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#333" }}>{upiId}</Text>
              ) : (
                <Text style={styles.warning}>Payee has not set a valid UPI ID.</Text>
              )}

              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                {hasValidUpi && !exceedsLimit ? (
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handlePayUPI}>
                    <Text style={styles.btnPrimaryText}>Pay via UPI</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => handleMarkSettled("manual")} disabled={processing}>
                    <Text style={styles.btnPrimaryText}>Mark Manual</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {hasValidUpi && (
                <TouchableOpacity style={{ marginTop: 16, alignItems: "center" }} onPress={() => handleMarkSettled("upi")} disabled={processing}>
                  <Text style={{ color: "#E91E63", fontWeight: "700" }}>I've already paid (Mark Settled)</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}