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
import {
  checkTrustAccess,
  getTierLabel,
} from "../../src/services/accessControl";

export default function TrustScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ScoreEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Trust Dashboard</Text>
        <Text style={styles.subtitle}>
          Your standing in the Harbor community.
        </Text>

        {/* Trust Balance Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Trust Balance</Text>
          <Text style={styles.heroValue}>{trustBalance}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{tierLabel}</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { width: `${trustBalance}%` }]}
            />
          </View>
        </View>

        {/* Dual Scores */}
        <View style={styles.scoresRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>Host Score</Text>
            <Text style={styles.scoreCardValue}>{user.hostScore ?? 50}</Text>
            <Text style={styles.scoreCardSub}>
              {user.plansHosted ?? 0} Plans hosted
            </Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>Guest Score</Text>
            <Text style={styles.scoreCardValue}>{user.guestScore ?? 50}</Text>
            <Text style={styles.scoreCardSub}>
              {user.plansJoined ?? 0} Plans joined
            </Text>
          </View>
        </View>

        {/* Streak */}
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Current Streak</Text>
            <Text style={styles.streakValue}>
              {user.streak ?? 0} successful Plans in a row
            </Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips to improve</Text>
          <Text style={styles.tipItem}>• Show up on time to every Plan (+10 Trust)</Text>
          <Text style={styles.tipItem}>• Host Plans regularly (+15 Host Score)</Text>
          <Text style={styles.tipItem}>• Get 5-star ratings (+5 Host / +2 Guest)</Text>
          <Text style={styles.tipItem}>• Cancel early if you must (no penalty {">"}7 days)</Text>
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {loading ? (
          <ActivityIndicator color="#E91E63" style={{ marginTop: 12 }} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: "800", color: "#1A1A1A" },
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
  barTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "#F8BBD0",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: "#E91E63" },
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
  tipsCard: {
    backgroundColor: "#F3E5F5",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
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