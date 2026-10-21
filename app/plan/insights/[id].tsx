// app/plan/insights/[id].tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { Plan } from "../../../src/types/plan";
import { PlanInsights } from "../../../src/types/insights";
import { generatePlanInsights } from "../../../src/services/insightsService";
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
  
  card: { backgroundColor: c.bgElevated, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: c.border, marginBottom: 16 },
  
  metricHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  metricValue: { fontSize: 32, fontWeight: "900", color: c.primary },
  metricLabel: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginBottom: 4 },
  
  progressTrack: { height: 8, backgroundColor: c.bgSubtle, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 4 },
  
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  detailText: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },
  
  nudgeBox: { backgroundColor: c.warning + "22", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.warning, marginBottom: 16 },
  nudgeTitle: { fontSize: 15, fontWeight: "800", color: c.warning, marginBottom: 4 },
  nudgeText: { fontSize: 13, color: c.text, lineHeight: 19 },

  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 12 },
  star: { fontSize: 32, color: "#FFC107" },
  ratingText: { fontSize: 24, fontWeight: "800", color: c.text },
  emptyRating: { fontSize: 15, color: c.textMuted, fontStyle: "italic", textAlign: "center", marginVertical: 20 },
});

export default function PlanInsightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [insights, setInsights] = useState<PlanInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plans", id), async (snap) => {
      if (snap.exists()) {
        const p = { id: snap.id, ...snap.data() } as Plan;
        setPlan(p);
        
        // Edge Case: Cancelled plans
        if (p.status === "cancelled") {
          setLoading(false);
          return;
        }

        const data = await generatePlanInsights(p);
        setInsights(data);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!plan) return null;

  if (plan.status === "cancelled") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Insights</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Plan Cancelled</Text>
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 8, paddingHorizontal: 40 }}>
            Insights are not available for cancelled plans.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!insights) return null;

  // Edge Case: No RSVPs
  if (insights.spotsFilled === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Insights</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.content}>
          <View style={styles.nudgeBox}>
            <Text style={styles.nudgeTitle}>No attendees</Text>
            <Text style={styles.nudgeText}>
              No one RSVP'd to this plan. Next time, try using the "Nudge" feature or sharing the plan link earlier!
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const spendPercentage = insights.budget > 0 ? (insights.actualSpend / insights.budget) * 100 : 0;
  const isOverBudget = spendPercentage > 100;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Attendance</Text>
        
        {/* RSVP Rate */}
        <View style={styles.card}>
          <View style={styles.metricHeader}>
            <View>
              <Text style={styles.metricLabel}>RSVP Rate</Text>
              <Text style={styles.metricValue}>{insights.rsvpRate}%</Text>
            </View>
            <Text style={styles.detailText}>
              {insights.spotsFilled} of {insights.capacity === 0 ? "∞" : insights.capacity} spots filled
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${insights.rsvpRate}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Satisfaction */}
        <View style={styles.card}>
          <Text style={styles.metricLabel}>Attendee Satisfaction</Text>
          {insights.hasEnoughRatings ? (
            <>
              <View style={styles.ratingRow}>
                <Text style={styles.star}>★</Text>
                <Text style={styles.ratingText}>{insights.averageRating} / 5</Text>
              </View>
              <Text style={[styles.detailText, { textAlign: "center" }]}>
                Based on {insights.totalRatings} reviews
              </Text>
            </>
          ) : (
            <Text style={styles.emptyRating}>
              Not enough reviews to show a rating (min 3 required to protect anonymity).
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Execution</Text>

        {/* Task Completion */}
        <View style={styles.card}>
          <View style={styles.metricHeader}>
            <View>
              <Text style={styles.metricLabel}>Task Completion</Text>
              <Text style={styles.metricValue}>{insights.taskCompletionRate}%</Text>
            </View>
            <Text style={styles.detailText}>
              {insights.completedTasks} of {insights.totalTasks} tasks done
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${insights.taskCompletionRate}%`, backgroundColor: colors.success }]} />
          </View>
        </View>

        {/* Budget */}
        <View style={styles.card}>
          <View style={styles.metricHeader}>
            <View>
              <Text style={styles.metricLabel}>Budget Usage</Text>
              <Text style={[styles.metricValue, isOverBudget && { color: colors.danger }]}>
                ₹{insights.actualSpend.toFixed(0)}
              </Text>
            </View>
            <Text style={styles.detailText}>
              Target: ₹{insights.budget.toFixed(0)}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(spendPercentage, 100)}%`, backgroundColor: isOverBudget ? colors.danger : colors.warning }
              ]} 
            />
          </View>
          {isOverBudget && (
            <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "600", marginTop: 8 }}>
              ⚠️ Went over budget by ₹{(insights.actualSpend - insights.budget).toFixed(0)}
            </Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}