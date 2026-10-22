// src/components/legal/ConsentModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { recordConsent, LegalDocType } from "../../services/legalService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  type: LegalDocType;
  latestVersion: string;
  onAccepted: () => void;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: c.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 20, lineHeight: 20 },
  checkboxRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, padding: 12, backgroundColor: c.bgSubtle, borderRadius: 10, borderWidth: 1, borderColor: c.border },
  checkboxText: { flex: 1, fontSize: 13, color: c.text, lineHeight: 18, paddingRight: 12 },
  actions: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center" },
  declineBtn: { backgroundColor: c.bgSubtle },
  declineText: { color: c.textSecondary, fontWeight: "700" },
  acceptBtn: { backgroundColor: c.primary },
  acceptText: { color: c.textInverse, fontWeight: "700" },
});

export default function ConsentModal({ visible, type, latestVersion, onAccepted }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [hasParentalConsent, setHasParentalConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await recordConsent(user.uid, type, latestVersion, hasParentalConsent);
      onAccepted();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline Policy?",
      "You must accept the policy to continue using Kithra. You will be signed out.",
      [
        { text: "Go Back", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: () => signOut(auth) }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>We've updated our {type === "privacy" ? "Privacy Policy" : "Terms"}</Text>
          <Text style={styles.subtitle}>
            Please review and accept the latest version ({latestVersion}) to continue using Kithra.
          </Text>

          <View style={styles.checkboxRow}>
            <Text style={styles.checkboxText}>
              I am over 18, or I have parental/guardian consent to use this app.
            </Text>
            <Switch value={hasParentalConsent} onValueChange={setHasParentalConsent} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={handleDecline}>
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, styles.acceptBtn, (!hasParentalConsent || saving) && { opacity: 0.5 }]} 
              onPress={handleAccept}
              disabled={!hasParentalConsent || saving}
            >
              <Text style={styles.acceptText}>{saving ? "Saving..." : "Accept & Continue"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}