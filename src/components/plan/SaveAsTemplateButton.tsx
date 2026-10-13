import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  View,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Plan } from "../../types/plan";
import { useAuth } from "../../context/AuthContext";
import { savePlanAsTemplate } from "../../services/templateService";

export default function SaveAsTemplateButton({ plan }: { plan: Plan }) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [name, setName] = useState(plan.title);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await savePlanAsTemplate(plan, user, name);
      setShow(false);
      Alert.alert(
        "Template saved",
        "You can reuse this from Profile → My Templates."
      );
    } catch (e: any) {
      Alert.alert("Could not save", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.btn} onPress={() => setShow(true)}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.text}>Save as template</Text>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Save as template</Text>
            <Text style={styles.desc}>
              Give it a name. You can reuse this shape when creating future Plans.
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Template name"
              placeholderTextColor="#999"
              maxLength={60}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancel}
                onPress={() => setShow(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.save, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFF",
    gap: 8,
    marginTop: 8,
  },
  icon: { fontSize: 16 },
  text: { fontSize: 14, fontWeight: "700", color: "#333" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 20, width: "100%" },
  title: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  desc: { fontSize: 13, color: "#666", marginTop: 6, marginBottom: 16, lineHeight: 19 },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 16, justifyContent: "flex-end" },
  cancel: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#666" },
  save: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E91E63",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});