// src/components/plan/CollectRequestModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { PlanParticipant } from "../../types/plan";
import { GarbaCrewUser } from "../../types/user";
import { CollectTarget } from "../../types/collect";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, total: number, targets: CollectTarget[]) => Promise<void>;
  participants: PlanParticipant[];
  participantUsers: GarbaCrewUser[];
  organizerUpi: string;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "800", color: c.text },
  closeBtn: { fontSize: 20, color: c.textMuted },
  label: { fontSize: 12, fontWeight: "700", color: c.textMuted, marginTop: 12, marginBottom: 6, textTransform: "uppercase" },
  input: { backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.bgSubtle },
  chipActive: { borderColor: c.primary, backgroundColor: c.primary + "11" },
  chipText: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
  chipTextActive: { color: c.primary },
  memberRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  memberName: { fontSize: 14, fontWeight: "600", color: c.text, flex: 1 },
  warningText: { color: c.danger, fontSize: 12, marginTop: 4 },
  saveBtn: { backgroundColor: c.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 20 },
  saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
});

export default function CollectRequestModal({ visible, onClose, onSave, participants, participantUsers, organizerUpi }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [title, setTitle] = useState("");
  const [totalStr, setTotalStr] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible) {
      setTitle("");
      setTotalStr("");
      setSplitType("equal");
      setSelectedUids(participants.map(p => p.uid));
      setCustomAmounts({});
    }
  }, [visible, participants]);

  const totalAmount = parseFloat(totalStr) || 0;
  const toggleMember = (uid: string) => {
    setSelectedUids(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Error", "Title required.");
    if (totalAmount <= 0) return Alert.alert("Error", "Total amount must be greater than 0.");
    if (selectedUids.length === 0) return Alert.alert("Error", "Select at least one person.");

    if (splitType === "custom") {
      let sum = 0;
      selectedUids.forEach(uid => sum += parseFloat(customAmounts[uid]) || 0);
      if (Math.abs(sum - totalAmount) > 0.01) {
        return Alert.alert("Error", `Custom amounts (₹${sum}) must equal total (₹${totalAmount}).`);
      }
    }

    const targets: CollectTarget[] = selectedUids.map(uid => {
      const p = participants.find(x => x.uid === uid);
      const user = participantUsers.find(x => x.uid === uid);
      const amount = splitType === "equal" ? totalAmount / selectedUids.length : parseFloat(customAmounts[uid]) || 0;
      const upiId = user?.upiId || null;

      return {
        uid,
        name: p?.name || "Unknown",
        amount,
        // Automatically exclude if no UPI ID
        status: upiId ? "pending" : "excluded",
        upiId,
      };
    });

    setSaving(true);
    try {
      await onSave(title.trim(), totalAmount, targets);
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>New Collect Request</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {!organizerUpi && (
              <Text style={[styles.warningText, { marginBottom: 12 }]}>
                ⚠️ You haven't set your UPI ID in Account settings. People won't be able to pay you directly.
              </Text>
            )}

            <Text style={styles.label}>What is this for?</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Venue advance payment" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Total Amount (₹)</Text>
            <TextInput style={styles.input} value={totalStr} onChangeText={setTotalStr} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Split Type</Text>
            <View style={styles.chipRow}>
              {(["equal", "custom"] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.chip, splitType === t && styles.chipActive]} onPress={() => setSplitType(t)}>
                  <Text style={[styles.chipText, splitType === t && styles.chipTextActive]}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Include Members</Text>
            {participants.map(p => {
              const isSelected = selectedUids.includes(p.uid);
              const user = participantUsers.find(x => x.uid === p.uid);
              const hasUpi = !!user?.upiId;

              return (
                <View key={p.uid} style={styles.memberRow}>
                  <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", flex: 1 }} onPress={() => toggleMember(p.uid)}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: isSelected ? colors.primary : colors.border, marginRight: 10, alignItems: "center", justifyContent: "center" }}>
                      {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                    </View>
                    <View>
                      <Text style={styles.memberName}>{p.name}</Text>
                      {!hasUpi && <Text style={{ fontSize: 10, color: colors.warning }}>No UPI ID - will be excluded</Text>}
                    </View>
                  </TouchableOpacity>

                  {isSelected && splitType === "custom" && (
                    <TextInput
                      style={{ width: 80, backgroundColor: colors.bgSubtle, borderRadius: 6, padding: 8, textAlign: "right", borderWidth: 1, borderColor: colors.border, color: colors.text }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={customAmounts[p.uid]}
                      onChangeText={(val) => setCustomAmounts(prev => ({ ...prev, [p.uid]: val }))}
                    />
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
            <Text style={styles.saveBtnText}>{saving ? "Creating..." : "Create Request"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}