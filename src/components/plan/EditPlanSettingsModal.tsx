// src/components/plan/EditPlanSettingsModal.tsx
import React, { useState, useEffect } from "react";
import { 
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, 
  Alert, Switch, Platform, KeyboardAvoidingView 
} from "react-native";
import { Plan } from "../../types/plan";
import { updatePlanVisibilityAndCapacity } from "../../services/planService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  plan: Plan;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === "ios" ? 40 : 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "800", color: c.text },
  closeBtn: { fontSize: 20, color: c.textMuted, padding: 4 },
  label: { fontSize: 13, fontWeight: "700", color: c.textMuted, marginBottom: 8, textTransform: "uppercase", marginTop: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.bgSubtle, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  rowTextCol: { flex: 1, paddingRight: 16 },
  rowTitle: { fontSize: 15, fontWeight: "700", color: c.text },
  rowSub: { fontSize: 12, color: c.textSecondary, marginTop: 2, lineHeight: 16 },
  input: { backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border },
  helpText: { fontSize: 11, color: c.textMuted, marginTop: 6 },
  saveBtn: { backgroundColor: c.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
});

export default function EditPlanSettingsModal({ visible, onClose, plan }: Props) {
  const styles = useThemedStyles(makeStyles);

  const [isPublic, setIsPublic] = useState(false);
  const [capacityStr, setCapacityStr] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsPublic(plan.visibility === "public");
      setCapacityStr(plan.capacity.toString());
    }
  }, [visible, plan]);

  const handleSave = async () => {
    const capacityNum = parseInt(capacityStr, 10);
    if (isNaN(capacityNum) || capacityNum < 0) {
      return Alert.alert("Invalid Capacity", "Please enter a valid number (0 for unlimited).");
    }

    if (capacityNum > 0 && capacityNum < plan.spotsFilled) {
      return Alert.alert(
        "Capacity Too Low", 
        `You currently have ${plan.spotsFilled} participants. Capacity cannot be less than this.`
      );
    }

    setSaving(true);
    try {
      await updatePlanVisibilityAndCapacity(
        plan.id,
        isPublic ? "public" : "private",
        capacityNum
      );
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
            <Text style={styles.title}>Plan Settings</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Visibility</Text>
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Make Plan Public</Text>
              <Text style={styles.rowSub}>If enabled, anyone in the city can discover and request to join this plan.</Text>
            </View>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: styles.saveBtn.backgroundColor }} />
          </View>

          <Text style={styles.label}>Capacity</Text>
          <TextInput
            style={styles.input}
            value={capacityStr}
            onChangeText={setCapacityStr}
            keyboardType="number-pad"
            placeholder="0"
          />
          <Text style={styles.helpText}>Set to 0 for unlimited capacity.</Text>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Settings"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}