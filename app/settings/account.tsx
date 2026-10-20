// app/settings/account.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../src/lib/firebase";
import app from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";

const functions = getFunctions(app, "asia-south1");
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  // UPI State
  const [upiId, setUpiId] = useState(user?.upiId || "");
  const [savingUpi, setSavingUpi] = useState(false);

  // Presence State (Task 24)
  const [presenceEnabled, setPresenceEnabled] = useState(true);

  useEffect(() => {
    if (user?.upiId) setUpiId(user.upiId);
    if (user) {
      setPresenceEnabled(user.presenceEnabled !== false); // Defaults to true
    }
  }, [user?.upiId, user?.presenceEnabled]);

  const handleSaveUpi = async () => {
    if (!user?.uid) return;
    const trimmed = upiId.trim();
    
    if (trimmed && !UPI_REGEX.test(trimmed)) {
      return Alert.alert(
        "Invalid UPI ID",
        "Please enter a valid UPI ID (e.g. name@okhdfcbank)."
      );
    }

    setSavingUpi(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { upiId: trimmed });
      Alert.alert("Saved", "Your UPI ID has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not save UPI ID.");
    } finally {
      setSavingUpi(false);
    }
  };

  const handleTogglePresence = async (val: boolean) => {
    if (!user?.uid) return;
    setPresenceEnabled(val);
    try {
      await updateDoc(doc(db, "users", user.uid), { presenceEnabled: val });
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setPresenceEnabled(!val); // revert on fail
    }
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      const fn = httpsCallable(functions, "deleteMyAccount");
      await fn({});
      await signOut(auth);
      router.replace("/(auth)/login" as any);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not delete account.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      Alert.alert(
        "Confirmation required",
        'Type "DELETE" to confirm account deletion.'
      );
      return;
    }

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "This will permanently delete your account. This cannot be undone.\n\nContinue?"
      );
      if (confirmed) performDelete();
      return;
    }

    Alert.alert(
      "Delete account?",
      "This will permanently delete your profile, scores, and history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete forever", style: "destructive", onPress: performDelete },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ─── Payment Settings (Task 14) ─── */}
        <Text style={styles.sectionTitle}>Payment Settings</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>UPI ID</Text>
          <Text style={styles.cardText}>
            Add your UPI ID so other plan members can easily settle balances with you using GPay, PhonePe, or Paytm.
          </Text>

          <TextInput
            style={[styles.confirmInput, { marginTop: 12 }]}
            placeholder="e.g. yourname@okhdfcbank"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            value={upiId}
            onChangeText={setUpiId}
          />

          <TouchableOpacity
            style={[styles.saveUpiBtn, savingUpi && { opacity: 0.5 }]}
            onPress={handleSaveUpi}
            disabled={savingUpi}
          >
            {savingUpi ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveUpiText}>Save UPI ID</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── Privacy Settings (Task 24) ─── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Privacy</Text>

        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.cardTitle}>Show Presence</Text>
              <Text style={styles.cardText}>
                Let others see when you are actively viewing a plan.
              </Text>
            </View>
            <Switch value={presenceEnabled} onValueChange={handleTogglePresence} />
          </View>
        </View>

        {/* ─── Data & Privacy ─── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Data & privacy</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export your data</Text>
          <Text style={styles.cardText}>
            Email us at privacy@Harbor.app to receive a copy of your data.
            We respond within 30 days.
          </Text>
        </View>

        {/* ─── Danger Zone ─── */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.cardTitle, { color: "#FF3B30" }]}>
            Delete account
          </Text>
          <Text style={styles.cardText}>
            Permanently deletes your profile, scores, and history. Your Plans
            and Squads you administer will be archived. This cannot be undone.
          </Text>

          <Text style={styles.confirmLabel}>
            Type DELETE to confirm
          </Text>
          <TextInput
            style={styles.confirmInput}
            placeholder="DELETE"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            value={confirmText}
            onChangeText={setConfirmText}
          />

          <TouchableOpacity
            style={[
              styles.deleteBtn,
              (!confirmText || deleting) && { opacity: 0.5 },
            ]}
            onPress={handleDelete}
            disabled={!confirmText || deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.deleteText}>Delete my account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backText: { fontSize: 22, color: "#666", fontWeight: "600", width: 24 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  scroll: { padding: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#F9F9F9",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  dangerCard: { borderColor: "#FFCDD2", backgroundColor: "#FFF5F5" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A", marginBottom: 6 },
  cardText: { fontSize: 13, color: "#666", lineHeight: 19 },
  confirmLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    marginTop: 16,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  confirmInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#FFF",
  },
  saveUpiBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: "#E91E63",
    borderRadius: 12,
    alignItems: "center",
  },
  saveUpiText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  deleteBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    alignItems: "center",
  },
  deleteText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});