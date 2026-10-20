// src/components/plan/ProposeIdeaModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { proposeIdea } from "../../services/ideaService";
import { PlanIdea } from "../../types/idea";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  planId: string;
  existingIdeas: PlanIdea[];
  isDateConfirmed: boolean;
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
  saveBtn: { backgroundColor: c.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 20 },
  saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
  postDecisionWarning: { backgroundColor: c.warning + "22", padding: 10, borderRadius: 8, marginTop: 12 },
  warningText: { color: c.warning, fontSize: 12, fontWeight: "600" },
});

export default function ProposeIdeaModal({ visible, onClose, planId, existingIdeas, isDateConfirmed }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [location, setLocation] = useState("");
  const [costStr, setCostStr] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Error", "Title is required.");
    if (!user) return;

    // Check duplicates
    const isDuplicate = existingIdeas.some(
      (i) => i.title.trim().toLowerCase() === title.trim().toLowerCase()
    );

    const proceed = await new Promise<boolean>((resolve) => {
      if (isDuplicate) {
        Alert.alert(
          "Possible Duplicate",
          "An idea with this title already exists. Propose it anyway?",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Propose anyway", onPress: () => resolve(true) },
          ]
        );
      } else {
        resolve(true);
      }
    });

    if (!proceed) return;

    setSaving(true);
    try {
      await proposeIdea(planId, {
        title: title.trim(),
        description: desc.trim(),
        link: link.trim() || null,
        location: location.trim() || null,
        estimatedCost: parseFloat(costStr) || null,
        proposerUid: user.uid,
        proposerName: user.name || "Unknown",
        proposerPhotoUrl: user.photoUrl || null,
        isPostDecision: isDateConfirmed,
      });
      onClose();
      setTitle(""); setDesc(""); setLink(""); setLocation(""); setCostStr("");
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
            <Text style={styles.title}>Propose Idea</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {isDateConfirmed && (
              <View style={styles.postDecisionWarning}>
                <Text style={styles.warningText}>⚠️ The date for this plan is already confirmed. This idea will be marked "post-decision".</Text>
              </View>
            )}

            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Try the new rooftop restaurant" />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { minHeight: 80 }]} value={desc} onChangeText={setDesc} multiline placeholder="Tell the group why this is a good idea..." />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Est. Cost (₹)</Text>
                <TextInput style={styles.input} value={costStr} onChangeText={setCostStr} keyboardType="decimal-pad" placeholder="Optional" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Location</Text>
                <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Area or Venue name" />
              </View>
            </View>

            <Text style={styles.label}>Link (Optional)</Text>
            <TextInput style={styles.input} value={link} onChangeText={setLink} keyboardType="url" autoCapitalize="none" placeholder="https://..." />
          </ScrollView>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Proposing..." : "Propose Idea"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}