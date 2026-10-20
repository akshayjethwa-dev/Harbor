// app/settings/notifications.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [taskReminders, setTaskReminders] = useState(true);
  const [overdueDigest, setOverdueDigest] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.reminderSettings) {
      setTaskReminders(user.reminderSettings.taskReminders ?? true);
      setOverdueDigest(user.reminderSettings.overdueDigest ?? true);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        reminderSettings: {
          taskReminders,
          overdueDigest,
          dndStart: 22, // Default: 10 PM
          dndEnd: 7,    // Default: 7 AM
        },
      });
      Alert.alert("Saved", "Notification preferences updated.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.textCol}>
            <Text style={styles.title}>Task Reminders</Text>
            <Text style={styles.subtitle}>Receive push notifications 24 hours and on the day a task is due.</Text>
          </View>
          <Switch value={taskReminders} onValueChange={setTaskReminders} />
        </View>

        <View style={styles.row}>
          <View style={styles.textCol}>
            <Text style={styles.title}>Overdue Digest</Text>
            <Text style={styles.subtitle}>Receive a daily summary of overdue tasks for plans you host.</Text>
          </View>
          <Switch value={overdueDigest} onValueChange={setOverdueDigest} />
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Preferences"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 22, color: c.text },
  headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
  content: { padding: 20 },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  textCol: { flex: 1, paddingRight: 16 },
  title: { fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
  saveBtn: {
    backgroundColor: c.primary, padding: 16, borderRadius: 12,
    alignItems: "center", marginTop: 32,
  },
  saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
});