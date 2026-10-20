// src/components/plan/ApplyTemplateModal.tsx
import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { TaskTemplate } from "../../types/taskTemplate";
import { getTaskTemplates, deleteTaskTemplate } from "../../services/taskService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  ownerUid: string;
  onSelect: (template: TaskTemplate) => Promise<void>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "800", color: c.text },
  closeBtn: { fontSize: 20, color: c.textMuted, padding: 4 },
  card: {
    backgroundColor: c.bgElevated, borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  name: { fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 4 },
  meta: { fontSize: 12, color: c.textSecondary },
  deleteBtn: { padding: 8, backgroundColor: c.danger + "11", borderRadius: 8 },
  deleteText: { color: c.danger, fontSize: 12, fontWeight: "700" },
  empty: { textAlign: "center", color: c.textMuted, marginVertical: 40 },
});

export default function ApplyTemplateModal({ visible, onClose, ownerUid, onSelect }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getTaskTemplates(ownerUid).then((data) => {
        setTemplates(data);
        setLoading(false);
      });
    }
  }, [visible, ownerUid]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTaskTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.warn("Delete failed", e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Apply Template</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={styles.title.color} style={{ margin: 20 }} />
          ) : (
            <ScrollView>
              {templates.length === 0 ? (
                <Text style={styles.empty}>No templates saved yet.</Text>
              ) : (
                templates.map((tpl) => (
                  <View key={tpl.id} style={styles.card}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{tpl.name}</Text>
                      <Text style={styles.meta}>{tpl.tasks.length} tasks</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.deleteBtn, { marginRight: 12 }]} 
                      onPress={() => handleDelete(tpl.id)}
                    >
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ backgroundColor: styles.title.color, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                      onPress={async () => {
                        setApplyingId(tpl.id);
                        await onSelect(tpl);
                        setApplyingId(null);
                        onClose();
                      }}
                      disabled={!!applyingId}
                    >
                      {applyingId === tpl.id ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={{ color: "#FFF", fontWeight: "700" }}>Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}