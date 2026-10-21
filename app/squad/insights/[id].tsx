// app/squad/insights/[id].tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { Squad, SquadInsights } from "../../../src/types/squad";
import { generateSquadInsights } from "../../../src/services/insightsService";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 22, color: c.text },
  headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  content: { padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, marginTop: 24 },
  
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { 
    flex: 1, minWidth: "45%", backgroundColor: c.bgElevated, padding: 16, 
    borderRadius: 16, borderWidth: 1, borderColor: c.border,
  },
  statValue: { fontSize: 28, fontWeight: "900", color: c.primary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: c.textSecondary, fontWeight: "600" },

  listCard: { backgroundColor: c.bgElevated, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  listRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  listRowLast: { borderBottomWidth: 0 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.bgSubtle, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarInitial: { fontSize: 14, fontWeight: "700", color: c.textMuted },
  nameCol: { flex: 1 },
  nameText: { fontSize: 15, fontWeight: "700", color: c.text },
  metaText: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  countBadge: { backgroundColor: c.primary + "11", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 13, fontWeight: "800", color: c.primary },

  emptyBox: { alignItems: "center", marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: c.textSecondary, textAlign: "center" },
});

export default function SquadInsightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [insights, setInsights] = useState<SquadInsights | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const squadSnap = await getDoc(doc(db, "squads", id));
        if (!squadSnap.exists()) return;
        
        const squadData = { id: squadSnap.id, ...squadSnap.data() } as Squad;
        setSquad(squadData);

        const aggregated = await generateSquadInsights(squadData);
        setInsights(aggregated);
      } catch (e) {
        console.warn("Insights fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!insights || !squad) return null;

  // Edge Case: New Squad
  if (insights.totalPlans === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Insights</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyBox}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyText}>Create your first plan with this squad to start seeing insights!</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Edge Case: 1 Member
  const isSolo = insights.currentMemberCount <= 1;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{squad.name} Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {isSolo && (
          <View style={{ backgroundColor: colors.warning + "22", padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <Text style={{ color: colors.warning, fontSize: 13, fontWeight: "600" }}>
              ⚠️ Limited Stats: You are the only member in this squad.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Plan Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{insights.totalPlans}</Text>
            <Text style={styles.statLabel}>Plans Created</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{insights.completedPlans}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{insights.cancelledPlans}</Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{insights.attendanceRate}%</Text>
            <Text style={styles.statLabel}>Attendance Rate</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Financials</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{insights.totalSpent.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{insights.perPersonSpend.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Per-Person Spend</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Most Active Members</Text>
        <View style={styles.listCard}>
          {insights.mostActiveMembers.length === 0 ? (
            <Text style={{ padding: 16, color: colors.textMuted }}>Not enough data.</Text>
          ) : (
            insights.mostActiveMembers.map((m, i) => (
              <View key={m.uid} style={[styles.listRow, i === insights.mostActiveMembers.length - 1 && styles.listRowLast]}>
                {m.photoUrl ? (
                  <Image source={{ uri: m.photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.nameCol}>
                  <Text style={styles.nameText}>{m.name}</Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{m.planCount} plans</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: "center", marginTop: 32, marginBottom: 40 }}>
          * Data shown is from the past 12 months.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}