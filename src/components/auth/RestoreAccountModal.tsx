// src/components/auth/RestoreAccountModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onRestored: () => void;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { backgroundColor: c.bg, borderRadius: 24, padding: 24, width: "100%", maxWidth: 400, alignItems: "center" },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: c.text, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: c.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  actions: { width: "100%", gap: 12 },
  btn: { width: "100%", padding: 16, borderRadius: 12, alignItems: "center" },
  restoreBtn: { backgroundColor: c.primary },
  restoreText: { color: c.textInverse, fontWeight: "700", fontSize: 16 },
  logoutBtn: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: c.border },
  logoutText: { color: c.textSecondary, fontWeight: "700", fontSize: 16 },
});

export default function RestoreAccountModal({ visible, onRestored }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        isDeleted: false,
        deletedAt: null,
      });
      onRestored();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not restore account.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log out?",
      "Your account will remain pending deletion. You can log back in within 30 days to restore it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: () => signOut(auth) }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Account Pending Deletion</Text>
          <Text style={styles.subtitle}>
            Your account is currently scheduled for permanent deletion. 
            {"\n\n"}
            Would you like to restore it and keep using Harbor?
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.btn, styles.restoreBtn, loading && { opacity: 0.5 }]} 
              onPress={handleRestore}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.restoreText}>Restore My Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.logoutBtn]} onPress={handleLogout} disabled={loading}>
              <Text style={styles.logoutText}>No, Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}