// src/components/profile/StreakCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useStreakFreeze } from "../../services/streakService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.bgElevated, borderRadius: 16, padding: 20, marginHorizontal: 24, marginBottom: 24,
    borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2,
  },
  iconCol: { marginRight: 16 },
  flameIcon: { fontSize: 40 },
  contentCol: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: c.textSecondary, marginBottom: 8 },
  statsRow: { flexDirection: "row", gap: 16 },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "800", color: c.primary },
  statLabel: { fontSize: 11, color: c.textMuted, textTransform: "uppercase" },
  freezeBtn: { backgroundColor: "#E3F2FD", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 8, alignSelf: "flex-start" },
  freezeText: { color: "#2196F3", fontSize: 12, fontWeight: "700" },
});

export default function StreakCard() {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const current = user.currentStreak || 0;
  const best = user.bestStreak || 0;
  const freezes = user.streakFreezes ?? 1; // Default to 1

  const handleUseFreeze = () => {
    Alert.alert(
      "Use Streak Freeze?",
      "This will protect your current streak if you don't attend a plan this week. You have " + freezes + " freeze(s) left.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Use Freeze", onPress: async () => {
            setLoading(true);
            try {
              await useStreakFreeze();
              Alert.alert("Freeze Applied", "Your streak is safe for this week!");
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.iconCol}>
        <Text style={styles.flameIcon}>{current > 0 ? "🔥" : "🕯️"}</Text>
      </View>
      <View style={styles.contentCol}>
        <Text style={styles.title}>{current} Week Streak</Text>
        <Text style={styles.subtitle}>
          {current > 0 ? "Keep it up! Attend a plan this week." : "Attend a plan this week to start a streak."}
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{best}</Text>
            <Text style={styles.statLabel}>Best</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{freezes}</Text>
            <Text style={styles.statLabel}>Freezes</Text>
          </View>
        </View>

        {freezes > 0 && (
          <TouchableOpacity style={styles.freezeBtn} onPress={handleUseFreeze} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#2196F3" /> : <Text style={styles.freezeText}>❄️ Use Freeze</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}