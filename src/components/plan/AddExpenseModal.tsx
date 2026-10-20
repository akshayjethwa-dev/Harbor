// src/components/plan/AddExpenseModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Platform, KeyboardAvoidingView
} from "react-native";
import { PlanParticipant, Plan } from "../../types/plan";
import { SplitType, ExpenseSplit } from "../../types/expense";
import { ParsedExpense } from "../../utils/ocrParser";
import ScreenshotParser from "./ScreenshotParser";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  participants: PlanParticipant[];
  plan: Plan;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "95%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "800", color: c.text },
  closeBtn: { fontSize: 20, color: c.textMuted },
  label: { fontSize: 12, fontWeight: "700", color: c.textMuted, marginTop: 12, marginBottom: 6, textTransform: "uppercase" },
  input: {
    backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15,
    color: c.text, borderWidth: 1, borderColor: c.border,
  },
  row: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  chip: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1.5, borderColor: c.border, backgroundColor: c.bgSubtle,
  },
  chipActive: { borderColor: c.primary, backgroundColor: c.primary + "11" },
  chipText: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
  chipTextActive: { color: c.primary },
  memberRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  memberName: { fontSize: 14, fontWeight: "600", color: c.text, flex: 1 },
  memberInput: {
    width: 80, backgroundColor: c.bgSubtle, borderRadius: 6, padding: 8,
    textAlign: "right", borderWidth: 1, borderColor: c.border, color: c.text,
  },
  warning: { color: c.danger, fontSize: 12, marginTop: 8, fontWeight: "600" },
  saveBtn: { backgroundColor: c.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 20 },
  saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
});

export default function AddExpenseModal({ visible, onClose, onSave, participants, plan }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [desc, setDesc] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [exchangeRate, setExchangeRate] = useState("1");
  
  const [paidByUid, setPaidByUid] = useState<string | null>(null);
  
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);

  // Reset form
  useEffect(() => {
    if (visible) {
      setDesc(""); setAmountStr(""); setCurrency("INR"); setExchangeRate("1");
      setPaidByUid(participants[0]?.uid || null);
      setSplitType("equal");
      setSelectedUids(participants.map(p => p.uid));
      setCustomAmounts({});
      setPercentages({});
    }
  }, [visible, participants]);

  const totalAmount = (parseFloat(amountStr) || 0) * (parseFloat(exchangeRate) || 1);
  const budgetWarning = plan.costTotal > 0 && totalAmount > plan.costTotal;

  // Toggle member for split
  const toggleMember = (uid: string) => {
    setSelectedUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // ─── Task 15: Handle OCR Result ───
  const handleParsedScreenshot = (data: ParsedExpense) => {
    // 1. Set amount
    if (data.amount) {
      setAmountStr(data.amount.toString());
    }

    // 2. Build description
    let newDesc = data.payee ? `Paid to ${data.payee}` : "UPI Payment";
    if (data.upiRef) newDesc += ` (Ref: ${data.upiRef})`;
    setDesc(newDesc);

    // 3. Try to auto-select the payer based on the extracted payee name
    if (data.payee) {
      const matched = participants.find(p => 
        p.name.toLowerCase().includes(data.payee!.toLowerCase()) || 
        data.payee!.toLowerCase().includes(p.name.toLowerCase())
      );
      if (matched) {
        setPaidByUid(matched.uid);
      }
    }
  };

  // Validation and Save
  const handleSave = async () => {
    if (!desc.trim()) return Alert.alert("Error", "Description required.");
    if (totalAmount <= 0) return Alert.alert("Error", "Amount must be greater than 0.");
    if (!paidByUid) return Alert.alert("Error", "Select who paid.");
    if (selectedUids.length === 0) return Alert.alert("Error", "Select at least one person to split with.");

    // Prepare splits
    const splits: ExpenseSplit[] = [];
    
    if (splitType === "equal") {
      const perPerson = totalAmount / selectedUids.length;
      selectedUids.forEach(uid => {
        const p = participants.find(x => x.uid === uid);
        splits.push({ uid, name: p?.name || "Unknown", amountOwed: perPerson });
      });
    } 
    else if (splitType === "custom") {
      let sum = 0;
      selectedUids.forEach(uid => {
        const val = parseFloat(customAmounts[uid]) || 0;
        sum += val;
        const p = participants.find(x => x.uid === uid);
        splits.push({ uid, name: p?.name || "Unknown", amountOwed: val });
      });
      if (Math.abs(sum - totalAmount) > 0.01) {
        return Alert.alert("Error", `Custom amounts (₹${sum.toFixed(2)}) must equal total (₹${totalAmount.toFixed(2)}).`);
      }
    } 
    else if (splitType === "percentage") {
      let sum = 0;
      selectedUids.forEach(uid => {
        const pct = parseFloat(percentages[uid]) || 0;
        sum += pct;
        const p = participants.find(x => x.uid === uid);
        splits.push({ 
          uid, 
          name: p?.name || "Unknown", 
          percentage: pct,
          amountOwed: (pct / 100) * totalAmount 
        });
      });
      if (Math.abs(sum - 100) > 0.01) {
        return Alert.alert("Error", "Percentages must sum to exactly 100%.");
      }
    }

    setSaving(true);
    try {
      const payer = participants.find(p => p.uid === paidByUid);
      
      await onSave({
        description: desc.trim(),
        amount: totalAmount,
        currency,
        originalAmount: parseFloat(amountStr),
        exchangeRate: parseFloat(exchangeRate) !== 1 ? parseFloat(exchangeRate) : null,
        paidByUid,
        paidByName: payer?.name || "Unknown",
        paidByPhotoUrl: payer?.photoUrl || null,
        splitType,
        splitAmong: splits,
      });
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Log Expense</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            
            {/* Task 15: Screenshot Parser */}
            <ScreenshotParser onParsed={handleParsedScreenshot} />

            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.input} value={desc} onChangeText={setDesc} placeholder="e.g., Uber to venue" placeholderTextColor={colors.textMuted} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Amount</Text>
                <TextInput style={styles.input} value={amountStr} onChangeText={setAmountStr} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Currency</Text>
                <TextInput style={styles.input} value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} />
              </View>
            </View>

            {currency !== "INR" && (
              <View>
                <Text style={styles.label}>Exchange Rate to INR</Text>
                <TextInput style={styles.input} value={exchangeRate} onChangeText={setExchangeRate} keyboardType="decimal-pad" />
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                  Total: ₹{totalAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {budgetWarning && (
              <Text style={styles.warning}>⚠️ This exceeds the plan's target budget (₹{plan.costTotal}).</Text>
            )}

            <Text style={styles.label}>Paid By</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {participants.map(p => (
                <TouchableOpacity key={p.uid} style={[styles.chip, paidByUid === p.uid && styles.chipActive]} onPress={() => setPaidByUid(p.uid)}>
                  <Text style={[styles.chipText, paidByUid === p.uid && styles.chipTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Split Type</Text>
            <View style={styles.chipRow}>
              {(["equal", "custom", "percentage"] as SplitType[]).map(t => (
                <TouchableOpacity key={t} style={[styles.chip, splitType === t && styles.chipActive]} onPress={() => setSplitType(t)}>
                  <Text style={[styles.chipText, splitType === t && styles.chipTextActive]}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Split Among</Text>
            {participants.map(p => {
              const isSelected = selectedUids.includes(p.uid);
              return (
                <View key={p.uid} style={styles.memberRow}>
                  <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", flex: 1 }} onPress={() => toggleMember(p.uid)}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: isSelected ? colors.primary : colors.border, marginRight: 10, alignItems: "center", justifyContent: "center" }}>
                      {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                    </View>
                    <Text style={styles.memberName}>{p.name}</Text>
                  </TouchableOpacity>

                  {isSelected && splitType === "custom" && (
                    <TextInput
                      style={styles.memberInput}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={customAmounts[p.uid]}
                      onChangeText={(val) => setCustomAmounts(prev => ({ ...prev, [p.uid]: val }))}
                    />
                  )}
                  {isSelected && splitType === "percentage" && (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TextInput
                        style={styles.memberInput}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={percentages[p.uid]}
                        onChangeText={(val) => setPercentages(prev => ({ ...prev, [p.uid]: val }))}
                      />
                      <Text style={{ marginLeft: 4, color: colors.textMuted }}>%</Text>
                    </View>
                  )}
                  {isSelected && splitType === "equal" && (
                    <Text style={{ fontWeight: "600", color: colors.textSecondary }}>
                      ₹{(totalAmount / selectedUids.length).toFixed(2)}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Log Expense"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}