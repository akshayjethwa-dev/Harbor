// src/components/profile/ReportProfileModal.tsx
import React, { useState } from "react";
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, ScrollView 
} from "react-native";
import { GarbaCrewUser } from "../../types/user";
import { ProfileReportReason } from "../../types/report";
import { reportProfile } from "../../services/reportService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  targetUser: GarbaCrewUser;
}

const REASONS: { label: string; value: ProfileReportReason }[] = [
  { label: "Fake Profile / Catfishing", value: "fake_profile" },
  { label: "Inappropriate Photos", value: "inappropriate_photos" },
  { label: "Harassment / Abuse", value: "harassment" },
  { label: "Spam / Advertising", value: "spam" },
  { label: "Other", value: "other" },
];

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "800", color: c.text },
  closeBtn: { fontSize: 20, color: c.textMuted },
  desc: { fontSize: 13, color: c.textSecondary, marginBottom: 16 },
  reasonItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: "row", alignItems: "center", gap: 10 },
  reasonText: { fontSize: 15, color: c.text, fontWeight: "600" },
  input: { backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border, minHeight: 80, textAlignVertical: "top", marginTop: 16 },
  submitBtn: { backgroundColor: c.danger, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});

export default function ReportProfileModal({ visible, onClose, targetUser }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const [selectedReason, setSelectedReason] = useState<ProfileReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || !user) {
      return Alert.alert("Error", "Please select a reason.");
    }

    setSubmitting(true);
    try {
      await reportProfile(targetUser, user, selectedReason, details);
      Alert.alert(
        "Report Submitted", 
        "Thank you. Our safety team will review this profile within 24 hours."
      );
      onClose();
      setSelectedReason(null);
      setDetails("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Report {targetUser.name}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          
          <Text style={styles.desc}>
            Help us keep Harbor safe. Reports are anonymous. False reports may result in penalties on your account.
          </Text>

          <ScrollView>
            {REASONS.map((r) => (
              <TouchableOpacity 
                key={r.value} 
                style={styles.reasonItem}
                onPress={() => setSelectedReason(r.value)}
              >
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selectedReason === r.value ? styles.submitBtn.backgroundColor : styles.closeBtn.color, alignItems: "center", justifyContent: "center" }}>
                  {selectedReason === r.value && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: styles.submitBtn.backgroundColor }} />}
                </View>
                <Text style={styles.reasonText}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.input}
              placeholder="Provide additional details (optional)..."
              placeholderTextColor={styles.closeBtn.color}
              multiline
              value={details}
              onChangeText={setDetails}
            />
          </ScrollView>

          <TouchableOpacity 
            style={[styles.submitBtn, (!selectedReason || submitting) && { opacity: 0.5 }]} 
            onPress={handleSubmit} 
            disabled={!selectedReason || submitting}
          >
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Report</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}