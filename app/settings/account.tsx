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
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { requestDataExport } from "../../src/services/exportService";

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  // UPI State
  const [upiId, setUpiId] = useState(user?.upiId || "");
  const [savingUpi, setSavingUpi] = useState(false);

  // Presence State
  const [presenceEnabled, setPresenceEnabled] = useState(true);

  // Analytics State
  const [analyticsOptOut, setAnalyticsOptOut] = useState(false);

  // Task 52: Leaderboard State
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.upiId) setUpiId(user.upiId);
    if (user) {
      setPresenceEnabled(user.presenceEnabled !== false);
      setAnalyticsOptOut(user.analyticsOptOut || false);
      setShowOnLeaderboard(user.showOnLeaderboard !== false);
    }
  }, [user?.upiId, user?.presenceEnabled, user?.analyticsOptOut, user?.showOnLeaderboard]);

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
      setPresenceEnabled(!val);
    }
  };

  const handleToggleAnalytics = async (val: boolean) => {
    if (!user?.uid) return;
    setAnalyticsOptOut(val);
    try {
      await updateDoc(doc(db, "users", user.uid), { analyticsOptOut: val });
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setAnalyticsOptOut(!val);
    }
  };

  const handleToggleLeaderboard = async (val: boolean) => {
    if (!user?.uid) return;
    setShowOnLeaderboard(val);
    try {
      await updateDoc(doc(db, "users", user.uid), { showOnLeaderboard: val });
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setShowOnLeaderboard(!val);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    setExportUrl(null);
    try {
      const url = await requestDataExport();
      setExportUrl(url);
      Alert.alert("Export Ready", "Your data is ready to download.");
    } catch (e: any) {
      Alert.alert("Export Failed", e.message);
    } finally {
      setExporting(false);
    }
  };

  const performDelete = async () => {
    if (!user?.uid) return;
    setDeleting(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
      });

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
        "Your account will be deactivated immediately. You will be signed out.\n\nYour data will be permanently purged after 30 days.\n\nContinue?"
      );
      if (confirmed) performDelete();
      return;
    }

    Alert.alert(
      "Delete account?",
      "Your profile will be deactivated immediately. You have a 30-day grace period to log back in and restore it. After 30 days, your personal data will be permanently purged.",
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
        {/* ─── Payment Settings ─── */}
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

        {/* ─── Privacy Settings ─── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Privacy</Text>

        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.cardTitle}>Show Presence</Text>
              <Text style={styles.cardText}>
                Let others see when you are actively viewing a plan.
              </Text>
            </View>
            <Switch value={presenceEnabled} onValueChange={handleTogglePresence} />
          </View>
          
          <View style={{ height: 1, backgroundColor: "#EEE", marginBottom: 16 }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.cardTitle}>Share Analytics</Text>
              <Text style={styles.cardText}>
                Allow us to collect anonymized usage data to improve the app.
              </Text>
            </View>
            <Switch value={!analyticsOptOut} onValueChange={(val) => handleToggleAnalytics(!val)} />
          </View>

          <View style={{ height: 1, backgroundColor: "#EEE", marginBottom: 16 }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.cardTitle}>Show on Leaderboard</Text>
              <Text style={styles.cardText}>
                Let your squad see your stats on the monthly leaderboard.
              </Text>
            </View>
            <Switch value={showOnLeaderboard} onValueChange={handleToggleLeaderboard} />
          </View>
        </View>

        {/* ─── Legal ─── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Legal</Text>

        <View style={styles.card}>
          <TouchableOpacity 
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEE" }}
            onPress={() => router.push("/legal/privacy" as any)}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#333" }}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ paddingVertical: 12 }}
            onPress={() => router.push("/legal/terms" as any)}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#333" }}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Data & Privacy ─── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Data & privacy</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export your data</Text>
          <Text style={styles.cardText}>
            Download a copy of your profile, plans, squads, expenses, and chats. 
            A secure link valid for 24 hours will be generated.
          </Text>

          <TouchableOpacity
            style={[styles.saveUpiBtn, { backgroundColor: "#2196F3", marginTop: 16 }, exporting && { opacity: 0.5 }]}
            onPress={handleExportData}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveUpiText}>Request Data Export</Text>
            )}
          </TouchableOpacity>

          {exportUrl && (
            <TouchableOpacity
              style={{ marginTop: 12, backgroundColor: "#E3F2FD", padding: 12, borderRadius: 10, alignItems: "center" }}
              onPress={() => Linking.openURL(exportUrl)}
            >
              <Text style={{ color: "#2196F3", fontWeight: "700" }}>⬇️ Download Your Data (.json)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Danger Zone ─── */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.cardTitle, { color: "#FF3B30" }]}>
            Delete account
          </Text>
          <Text style={styles.cardText}>
            Your profile will be deactivated immediately and hidden from other users. 
            {"\n\n"}
            <Text style={{ fontWeight: "700" }}>Data Retention Policy:</Text>
            {"\n"}
            • Account data and personal info will be permanently purged from our systems 
            after a 30-day grace period.
            {"\n"}
            • Chat messages are retained for 1 year for safety purposes.
            {"\n"}
            • Financial/Expense records are anonymized and retained for 7 years to comply with tax laws.
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