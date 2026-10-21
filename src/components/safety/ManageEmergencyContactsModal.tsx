// src/components/safety/ManageEmergencyContactsModal.tsx
import React, { useState, useEffect } from "react";
import { 
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getEmergencyContacts, saveEmergencyContacts } from "../../services/safetyService";
import { EmergencyContact } from "../../types/safety";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "800", color: c.text },
  closeBtn: { fontSize: 20, color: c.textMuted },
  contactRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  contactText: { fontSize: 16, fontWeight: "600", color: c.text },
  contactSub: { fontSize: 13, color: c.textSecondary },
  removeBtn: { padding: 8 },
  removeText: { color: c.danger, fontWeight: "700" },
  
  inputRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  input: { flex: 1, backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border },
  addBtn: { backgroundColor: c.primary, paddingHorizontal: 16, justifyContent: "center", borderRadius: 10 },
  addBtnText: { color: c.textInverse, fontWeight: "700" },
  saveBtn: { backgroundColor: c.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
});

export default function ManageEmergencyContactsModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setLoading(true);
      getEmergencyContacts(user.uid).then(data => {
        setContacts(data);
        setLoading(false);
      });
    }
  }, [visible, user]);

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) return;
    if (!phone.startsWith("+")) {
      return Alert.alert("Invalid Format", "Phone number must include country code (e.g., +91).");
    }
    setContacts(prev => [...prev, { id: Date.now().toString(), name: name.trim(), phone: phone.trim() }]);
    setName("");
    setPhone("");
  };

  const handleRemove = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveEmergencyContacts(user.uid, contacts);
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
            <Text style={styles.title}>Emergency Contacts</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator color={styles.title.color} /> : (
            <ScrollView style={{ maxHeight: 300 }}>
              {contacts.length === 0 ? (
                <Text style={{ color: styles.contactSub.color, textAlign: "center", marginVertical: 20 }}>
                  No contacts added yet.
                </Text>
              ) : (
                contacts.map(c => (
                  <View key={c.id} style={styles.contactRow}>
                    <View>
                      <Text style={styles.contactText}>{c.name}</Text>
                      <Text style={styles.contactSub}>{c.phone}</Text>
                    </View>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(c.id)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          <View style={styles.inputRow}>
            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="+91..." value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Contacts"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}