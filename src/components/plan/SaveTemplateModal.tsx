// src/components/plan/SaveTemplateModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: c.bg, borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 8 },
  desc: { fontSize: 13, color: c.textSecondary, marginBottom: 16, lineHeight: 18 },
  input: {
    backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15,
    color: c.text, borderWidth: 1, borderColor: c.border, marginBottom: 20,
  },
  row: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border },
  cancelText: { color: c.textSecondary, fontWeight: "700" },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: c.primary },
  saveText: { color: c.textInverse, fontWeight: "700" },
});

export default function SaveTemplateModal({ visible, onClose, onSave }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a name for this template.");
      return;
    }
    setSaving(true);
    try {
      await onSave(name.trim());
      setName("");
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
          <Text style={styles.title}>Save as Template</Text>
          <Text style={styles.desc}>
            Save these tasks to reuse in future plans. Assignees and due dates will be cleared.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Template Name (e.g., Standard Garba Prep)"
            placeholderTextColor={styles.desc.color}
            value={name}
            onChangeText={setName}
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