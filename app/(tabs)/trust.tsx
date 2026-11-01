// app/(tabs)/trust.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { getScoreHistory, ScoreEvent } from "../../src/services/scoreService";
import { checkTrustAccess, getTierLabel } from "../../src/services/accessControl";
import TrustPrimerModal from "../../src/components/trust/TrustPrimerModal";
import TrustScoreBreakdownSheet from "../../src/components/trust/TrustScoreBreakdownSheet"; // <-- NEW IMPORT

export default function TrustScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ScoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [primerVisible, setPrimerVisible] = useState(false);
  const [breakdownVisible, setBreakdownVisible] = useState(false); // <-- NEW STATE

  useEffect(() => {
    if (!user) return;
    getScoreHistory(user.uid)
      .then(setHistory)
      .catch((e) => console.warn("History fetch failed:", e))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const trustBalance = user.trustBalance ?? 50;
  const access = checkTrustAccess(user, "join_plan");
  const tierLabel = getTierLabel(access.level);

  // Derive breakdown values from the user object
  // Note: Adjust these calculations based on your actual data model
  const showUpRate = user.completedPlans && user.plansJoined 
    ? Math.round((user.completedPlans / user.plansJoined) * 100) 
    : 100;
  const hostRating = user.hostScore ?? 50;
  const guestRating = user.guestScore ?? 50;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with Help Icon */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Trust Dashboard</Text>
          <TouchableOpacity
            onPress={() => setPrimerVisible(true)}
            style={styles.helpButton}
            accessibilityLabel="What is Trust Balance?"
          >
            <Text style={styles.helpIcon}>?</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Your standing in the Kithra community.
        </Text>

        {/* Trust Balance Hero - Made Tappable */}
        <TouchableOpacity
          style={styles.hero}
          activeOpacity={0.7}
          onPress={() => setBreakdownVisible(true)} // <-- TRIGGER BREAKDOWN
        >
          <Text style={styles.heroLabel}>Trust Balance</Text>
          <Text style={styles.heroValue}>{trustBalance}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{tierLabel}</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { width: `${Math.min(trustBalance, 100)}%` }]}
            />
          </View>
          <Text style={styles.tapHint}>Tap to see breakdown</Text>
        </TouchableOpacity>

        {/* Dual Scores */}
        <View style={styles.scoresRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>Host Score</Text>
            <Text style={styles.scoreCardValue}>{user.hostScore ?? 50}</Text>
            <Text style={styles.scoreCardSub}>{user.plansHosted ?? 0} Plans hosted</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>Guest Score</Text>
            <Text style={styles.scoreCardValue}>{user.guestScore ?? 50}</Text>
            <Text style={styles.scoreCardSub}>{user.plansJoined ?? 0} Plans joined</Text>
          </View>
        </View>

        {/* Streak */}
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakTitle}>Current Streak</Text>
            <Text style={styles.streakValue}>{user.streak ?? 0} successful Plans in a row</Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips to improve</Text>
          <Text style={styles.tipItem}>• Show up on time to every Plan (+10 Trust)</Text>
          <Text style={styles.tipItem}>• Host Plans regularly (+15 Host Score)</Text>
          <Text style={styles.tipItem}>• Get 5-star ratings (+5 Host / +2 Guest)</Text>
          <Text style={styles.tipItem}>
            • Cancel early if you must (no penalty {">"}7 days)
          </Text>
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {loading ? (
          <ActivityIndicator color="#E91E63" />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>
            No activity yet. Join your first Plan to start building trust.
          </Text>
        ) : (
          history.map((event) => (
            <View key={event.id} style={styles.historyRow}>
              <Text style={styles.historyType}>{event.type}</Text>
              <Text
                style={[
                  styles.historyDelta,
                  event.delta >= 0 ? styles.deltaPositive : styles.deltaNegative,
                ]}
              >
                {event.delta >= 0 ? `+${event.delta}` : event.delta}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Contextual Primer Modal */}
      <TrustPrimerModal
        visible={primerVisible}
        onClose={() => setPrimerVisible(false)}
      />

      {/* NEW: Trust Score Breakdown Bottom Sheet */}
      <TrustScoreBreakdownSheet
        visible={breakdownVisible}
        onClose={() => setBreakdownVisible(false)}
        showUpRate={showUpRate}
        hostRating={hostRating}
        guestRating={guestRating}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 60 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#1A1A1A" },
  helpButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  helpIcon: { fontSize: 18, fontWeight: "700", color: "#666" },
  subtitle: { fontSize: 15, color: "#666", marginTop: 4, marginBottom: 24 },
  hero: {
    backgroundColor: "#FFF0F5",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F8BBD0",
    marginBottom: 20,
  },
  heroLabel: { fontSize: 13, color: "#999", fontWeight: "600" },
  heroValue: { fontSize: 56, fontWeight: "800", color: "#E91E63", marginVertical: 4 },
  tierBadge: {
    backgroundColor: "#E91E63",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  tierText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  barTrack: { width: "100%", height: 8, backgroundColor: "#F8BBD0", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#E91E63" },
  tapHint: { fontSize: 12, color: "#E91E63", marginTop: 12, fontWeight: "600" },
  scoresRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  scoreCard: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  scoreCardLabel: { fontSize: 12, color: "#999", fontWeight: "600" },
  scoreCardValue: { fontSize: 32, fontWeight: "800", color: "#333", marginVertical: 4 },
  scoreCardSub: { fontSize: 12, color: "#999" },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  streakEmoji: { fontSize: 32, marginRight: 14 },
  streakTitle: { fontSize: 13, color: "#F57F17", fontWeight: "700" },
  streakValue: { fontSize: 15, color: "#666", marginTop: 2 },
  tipsCard: { backgroundColor: "#F3E5F5", borderRadius: 16, padding: 18, marginBottom: 24 },
  tipsTitle: { fontSize: 15, fontWeight: "700", color: "#6A1B9A", marginBottom: 10 },
  tipItem: { fontSize: 14, color: "#555", lineHeight: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", marginBottom: 12 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", marginTop: 12 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  historyType: { fontSize: 14, color: "#333", fontWeight: "600" },
  historyDelta: { fontSize: 14, fontWeight: "800" },
  deltaPositive: { color: "#2E7D32" },
  deltaNegative: { color: "#FF3B30" },
});