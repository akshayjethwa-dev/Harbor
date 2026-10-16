import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  getEmergencyContacts,
  getMyBlocks,
  getMyStrikes,
  getMyDisputes,
} from "../../src/services/safetyService";

export default function SafetySettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [contacts, setContacts] = useState<number>(0);
  const [blocks, setBlocks] = useState<number>(0);
  const [strikes, setStrikes] = useState<number>(0);
  const [disputes, setDisputes] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [c, b, s, d] = await Promise.all([
        getEmergencyContacts(user.uid),
        getMyBlocks(user.uid),
        getMyStrikes(user.uid),
        getMyDisputes(user.uid),
      ]);
      setContacts(c.length);
      setBlocks(b.length);
      setStrikes(s.length);
      setDisputes(d.length);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  const rows = [
    {
      key: "emergency",
      icon: "🚨",
      title: "Emergency contacts",
      subtitle:
        contacts === 0
          ? "Add up to 3 contacts to be alerted in an SOS"
          : `${contacts} contact${contacts === 1 ? "" : "s"} saved`,
      route: "/settings/emergency-contacts",
    },
    {
      key: "blocked",
      icon: "🚫",
      title: "Blocked users",
      subtitle:
        blocks === 0
          ? "No users blocked"
          : `${blocks} user${blocks === 1 ? "" : "s"} blocked`,
      route: "/settings/blocked-users",
    },
    {
      key: "disputes",
      icon: "⚖️",
      title: "My disputes",
      subtitle:
        disputes === 0
          ? "No disputes filed"
          : `${disputes} dispute${disputes === 1 ? "" : "s"}`,
      route: "/settings/disputes",
    },
    {
      key: "strikes",
      icon: "⚠️",
      title: "Account standing",
      subtitle:
        strikes === 0
          ? "Clean record ✨"
          : `${strikes} active strike${strikes === 1 ? "" : "s"}`,
      route: null,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trust & Safety</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {rows.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={styles.row}
            onPress={() => r.route && router.push(r.route as any)}
            disabled={!r.route}
          >
            <Text style={styles.rowIcon}>{r.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{r.title}</Text>
              <Text style={styles.rowSubtitle}>{r.subtitle}</Text>
            </View>
            {r.route && <Text style={styles.chevron}>›</Text>}
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Your safety matters</Text>
          <Text style={styles.infoText}>
            Harbor uses a Trust & Safety system with three-strike enforcement.
            Report any concerns and our moderators will review within 24 hours.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  rowIcon: { fontSize: 26, marginRight: 14, width: 32, textAlign: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  rowSubtitle: { fontSize: 12, color: "#666", marginTop: 3 },
  chevron: { fontSize: 26, color: "#CCC", fontWeight: "300" },
  infoBox: {
    marginTop: 32,
    backgroundColor: "#F3E5F5",
    borderRadius: 16,
    padding: 18,
  },
  infoTitle: { fontSize: 14, fontWeight: "800", color: "#6A1B9A", marginBottom: 8 },
  infoText: { fontSize: 13, color: "#555", lineHeight: 20 },
});