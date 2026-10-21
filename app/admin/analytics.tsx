// app/admin/analytics.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";

interface DailyMetric {
  date: string;
  dau: number;
  featureUsage: Record<string, number>;
  funnel: { app_opened: number; plan_viewed: number; plan_created: number };
  isPrivacyProtected: boolean;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 22, color: c.text },
  headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
  scroll: { padding: 16 },
  
  card: { backgroundColor: c.bgElevated, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border },
  cardTitle: { fontSize: 14, fontWeight: "700", color: c.textMuted, textTransform: "uppercase", marginBottom: 12 },
  
  metricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  metricLabel: { fontSize: 15, color: c.text },
  metricValue: { fontSize: 18, fontWeight: "800", color: c.primary },
  
  funnelRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  funnelBar: { height: 24, backgroundColor: c.primary + "33", borderRadius: 4, marginRight: 8 },
  funnelText: { fontSize: 13, fontWeight: "600", color: c.text },
  
  warningBox: { backgroundColor: c.warning + "22", padding: 12, borderRadius: 8, marginBottom: 16 },
  warningText: { color: c.warning, fontSize: 13, fontWeight: "600" },
  
  timestamp: { fontSize: 12, color: c.textMuted, textAlign: "center", marginTop: 20 },
});

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [mau, setMau] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch last 7 days
        const q = query(collection(db, "admin_analytics"), orderBy("date", "desc"), limit(7));
        const snap = await getDocs(q);
        
        const data: DailyMetric[] = [];
        snap.forEach((doc) => {
          if (doc.id !== "latest_summary") data.push(doc.data() as DailyMetric);
        });
        setMetrics(data);

        // Fetch MAU Summary
        const summarySnap = await getDoc(doc(db, "admin_analytics", "latest_summary"));
        if (summarySnap.exists()) {
          setMau(summarySnap.data().mauProxy || 0);
          const lu = summarySnap.data().lastUpdated?.toDate();
          if (lu) setLastUpdated(lu.toLocaleString());
        }
      } catch (e) {
        console.warn("Failed to load analytics", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <View style={styles.container}><ActivityIndicator style={{ marginTop: 100 }} /></View>;
  }

  const latest = metrics[0];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {latest?.isPrivacyProtected && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Yesterday's user count was below the privacy threshold (K-Anonymity). Exact metrics are hidden.
            </Text>
          </View>
        )}

        {/* High Level Metrics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Users</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>DAU (Yesterday)</Text>
            <Text style={styles.metricValue}>{latest?.isPrivacyProtected ? "Protected" : latest?.dau ?? 0}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>MAU (30-day proxy)</Text>
            <Text style={styles.metricValue}>{mau ?? "N/A"}</Text>
          </View>
        </View>

        {/* Feature Usage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Feature Usage (Yesterday)</Text>
          {latest && !latest.isPrivacyProtected && Object.entries(latest.featureUsage).map(([feat, count]) => (
            <View key={feat} style={styles.metricRow}>
              <Text style={styles.metricLabel}>{feat.replace(/_/g, " ").toUpperCase()}</Text>
              <Text style={styles.metricValue}>{count}</Text>
            </View>
          ))}
          {(!latest || latest.isPrivacyProtected) && <Text style={{ color: colors.textMuted }}>Data hidden for privacy.</Text>}
        </View>

        {/* Funnel Analysis */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan Creation Funnel</Text>
          {latest && !latest.isPrivacyProtected && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <View style={[styles.funnelBar, { width: `${(latest.funnel.app_opened / latest.funnel.app_opened) * 100}%` }]} />
                <Text style={styles.funnelText}>Opened App: {latest.funnel.app_opened}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <View style={[styles.funnelBar, { width: `${(latest.funnel.plan_viewed / latest.funnel.app_opened) * 100}%`, backgroundColor: colors.primary }]} />
                <Text style={styles.funnelText}>Viewed Plan: {latest.funnel.plan_viewed}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <View style={[styles.funnelBar, { width: `${(latest.funnel.plan_created / latest.funnel.app_opened) * 100}%`, backgroundColor: colors.success }]} />
                <Text style={styles.funnelText}>Created Plan: {latest.funnel.plan_created}</Text>
              </View>
            </>
          )}
        </View>

        {lastUpdated ? (
          <Text style={styles.timestamp}>Data last aggregated on: {lastUpdated}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}