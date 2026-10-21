// app/squad/leaderboard/[id].tsx
import React, { useEffect, useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  ScrollView, Image 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { Squad } from "../../../src/types/squad";
import { getSquadLeaderboard, LeaderboardEntry } from "../../../src/services/leaderboardService";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 22, color: c.text },
  headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  
  monthBadge: { backgroundColor: c.primary + "11", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "center", marginTop: 16, marginBottom: 24 },
  monthText: { fontSize: 13, fontWeight: "700", color: c.primary },

  listContent: { padding: 16 },
  entryCard: { flexDirection: "row", alignItems: "center", backgroundColor: c.bgElevated, padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  rankBox: { width: 40, alignItems: "center", marginRight: 12 },
  rankText: { fontSize: 18, fontWeight: "900", color: c.textMuted },
  rankGold: { color: "#FFD700" },
  rankSilver: { color: "#C0C0C0" },
  rankBronze: { color: "#CD7F32" },
  
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.bgSubtle, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarInitial: { fontSize: 18, fontWeight: "700", color: c.textMuted },
  
  nameCol: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: "700", color: c.text },
  statsText: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
  
  scoreBox: { alignItems: "flex-end" },
  scoreText: { fontSize: 16, fontWeight: "900", color: c.primary },
  scoreLabel: { fontSize: 10, color: c.textMuted, textTransform: "uppercase" },

  inactiveDivider: { fontSize: 12, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", marginTop: 16, marginBottom: 12, textAlign: "center" },
});

export default function SquadLeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [squad, setSquad] = useState<Squad | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchLeaderboard = async () => {
      try {
        const squadSnap = await getDoc(doc(db, "squads", id));
        if (!squadSnap.exists()) return;
        
        const squadData = { id: squadSnap.id, ...squadSnap.data() } as Squad;
        setSquad(squadData);

        const data = await getSquadLeaderboard(squadData);
        setLeaderboard(data);
      } catch (e) {
        console.warn("Leaderboard fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (squad && squad.memberUids.length <= 1) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>👥</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" }}>Need more members</Text>
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 8 }}>
            Invite friends to your squad to start competing on the leaderboard!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const active = leaderboard.filter(l => l.score > 0);
  const inactive = leaderboard.filter(l => l.score === 0);

  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        <View style={styles.monthBadge}>
          <Text style={styles.monthText}>📅 {monthName} Standings</Text>
        </View>

        {leaderboard.length === 0 && (
          <Text style={{ textAlign: "center", color: colors.textMuted, marginTop: 40 }}>
            No members are currently participating in the leaderboard.
          </Text>
        )}

        {active.map((entry) => {
          // FIXED: Initialize as empty object so TypeScript doesn't complain about missing properties
          let rankStyle = {};
          if (entry.rank === 1) rankStyle = styles.rankGold;
          else if (entry.rank === 2) rankStyle = styles.rankSilver;
          else if (entry.rank === 3) rankStyle = styles.rankBronze;

          return (
            <View key={entry.uid} style={styles.entryCard}>
              <View style={styles.rankBox}>
                <Text style={[styles.rankText, rankStyle]}>#{entry.rank}</Text>
              </View>
              {entry.photoUrl ? (
                <Image source={{ uri: entry.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{entry.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.nameCol}>
                <Text style={styles.nameText}>{entry.name}</Text>
                <Text style={styles.statsText}>
                  {entry.plansCount} Plans · {entry.tasksCount} Tasks · ₹{entry.expenseTotal}
                </Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreText}>{entry.score}</Text>
                <Text style={styles.scoreLabel}>Points</Text>
              </View>
            </View>
          );
        })}

        {inactive.length > 0 && (
          <>
            <Text style={styles.inactiveDivider}>Inactive</Text>
            {inactive.map((entry) => (
              <View key={entry.uid} style={[styles.entryCard, { opacity: 0.6 }]}>
                <View style={styles.rankBox}>
                  <Text style={styles.rankText}>-</Text>
                </View>
                {entry.photoUrl ? (
                  <Image source={{ uri: entry.photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{entry.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.nameCol}>
                  <Text style={styles.nameText}>{entry.name}</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreText}>0</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}