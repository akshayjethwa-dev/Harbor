// app/host/revenue.tsx
import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { fetchHostRevenue, exportPayoutsToCSV, RevenueSummary } from "../../src/services/revenueService";
import { HostPayout } from "../../src/types/payout";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 22, color: c.text },
  headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  scroll: { padding: 20 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, minWidth: "45%", backgroundColor: c.bgElevated, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border },
  summaryLabel: { fontSize: 12, color: c.textMuted, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: "900", color: c.text },

  alertBox: { backgroundColor: c.danger + "15", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.danger, marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 12 },
  alertText: { color: c.danger, fontSize: 13, fontWeight: "600", flex: 1, lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: c.text, marginBottom: 12 },
  
  payoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.bgElevated, padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  planTitle: { fontSize: 15, fontWeight: "700", color: c.text, marginBottom: 4 },
  dateText: { fontSize: 12, color: c.textSecondary },
  amountCol: { alignItems: "flex-end" },
  amountText: { fontSize: 16, fontWeight: "800", color: c.text },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },

  exportBtn: { backgroundColor: c.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
  exportBtnText: { color: c.textInverse, fontWeight: "700", fontSize: 16 },

  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: c.textSecondary, textAlign: "center", paddingHorizontal: 32 },
});

export default function HostRevenueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<HostPayout[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.subscriptionTier !== "host") {
      Alert.alert("Access Denied", "This dashboard is only available for Host Tier subscribers.");
      router.back();
      return;
    }

    fetchHostRevenue(user.uid).then((data) => {
      setPayouts(data.payouts);
      setSummary(data.summary);
      setLoading(false);
    }).catch((e) => {
      Alert.alert("Error", "Could not load revenue data.");
      setLoading(false);
    });
  }, [user, router]);

  // Edge Case: Pending Payout > 7 days
  const hasOldPendingPayout = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return payouts.some(p => {
      if (p.status !== "pending" && p.status !== "processing") return false;
      const createdMs = p.createdAt?.toMillis?.() || 0;
      return createdMs < sevenDaysAgo;
    });
  }, [payouts]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Revenue Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {hasOldPendingPayout && (
          <View style={styles.alertBox}>
            <Text style={{ fontSize: 24 }}>⚠️</Text>
            <Text style={styles.alertText}>
              You have a pending payout that is over 7 days old. Please verify your UPI ID in Account Settings.
            </Text>
          </View>
        )}

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Gross Revenue</Text>
            <Text style={styles.summaryValue}>₹{summary?.gross.toFixed(0) ?? 0}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Platform Fees</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>-₹{summary?.fees.toFixed(0) ?? 0}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Net Payouts</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>₹{summary?.net.toFixed(0) ?? 0}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>₹{summary?.pending.toFixed(0) ?? 0}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payout History</Text>

        {payouts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyTitle}>No revenue yet</Text>
            <Text style={styles.emptyText}>
              Create a paid plan to start earning. Your earnings will appear here.
            </Text>
          </View>
        ) : (
          payouts.map((p) => {
            const isRefunded = p.status === "refunded";
            const statusColor = isRefunded ? colors.danger : p.status === "paid" ? colors.success : colors.warning;
            
            return (
              <View key={p.id} style={[styles.payoutRow, isRefunded && { opacity: 0.6 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.planTitle} numberOfLines={1}>{p.planTitle}</Text>
                  <Text style={styles.dateText}>{p.createdAt?.toDate?.().toLocaleDateString() ?? "Pending"}</Text>
                </View>
                <View style={styles.amountCol}>
                  <Text style={[styles.amountText, isRefunded && { textDecorationLine: "line-through" }]}>
                    ₹{p.netAmount.toFixed(0)}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: statusColor + "22" }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{p.status}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {payouts.length > 0 && (
          <TouchableOpacity style={styles.exportBtn} onPress={() => exportPayoutsToCSV(payouts)}>
            <Text style={styles.exportBtnText}>📥 Export as CSV</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}