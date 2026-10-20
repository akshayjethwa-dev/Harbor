// src/components/plan/RecapCard.tsx
import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Plan } from "../../types/plan";
import { PlanPhoto } from "../../types/photo";
import { PlanExpense } from "../../types/expense";
import { PlanTask } from "../../types/task";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  plan: Plan;
  photos: PlanPhoto[];
  expenses: PlanExpense[];
  tasks: PlanTask[];
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: c.bg, borderRadius: 24, overflow: "hidden", marginBottom: 24 },
  gradientHeader: { padding: 32, alignItems: "center" },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "900", color: "#FFF", textAlign: "center", marginBottom: 8 },
  date: { fontSize: 15, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  
  photoGrid: { flexDirection: "row", height: 200, backgroundColor: c.bgSubtle },
  mainPhoto: { flex: 2, height: "100%" },
  sidePhotos: { flex: 1, height: "100%", flexDirection: "column" },
  sidePhoto: { flex: 1, height: "50%", paddingBottom: 2, paddingLeft: 2 },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  emptyPhotoBox: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bgSubtle },
  emptyPhotoText: { fontSize: 40 },

  statsContainer: { padding: 24 },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  statBox: { flex: 1, alignItems: "center", backgroundColor: c.bgElevated, padding: 16, borderRadius: 16, marginHorizontal: 4, borderWidth: 1, borderColor: c.border },
  statValue: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: c.textMuted, fontWeight: "700", textTransform: "uppercase" },

  sectionTitle: { fontSize: 14, fontWeight: "800", color: c.text, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  attendeeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.bgSubtle, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 14, fontWeight: "700", color: c.textMuted },
  
  footer: { alignItems: "center", paddingBottom: 24 },
  footerText: { fontSize: 12, color: c.textMuted, fontWeight: "600" },
});

export default function RecapCard({ plan, photos, expenses, tasks }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Calculate Stats
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const totalTasks = tasks.length;

  // Format Date
  const dateStr = plan.startTime?.toDate
    ? plan.startTime.toDate().toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "";

  // Select top 3 photos
  const displayPhotos = photos.slice(0, 3);

  return (
    <View style={styles.card}>
      {/* Header */}
      <LinearGradient colors={[colors.primary, colors.primary + "AA"]} style={styles.gradientHeader}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </LinearGradient>

      {/* Photo Grid */}
      {displayPhotos.length > 0 ? (
        <View style={styles.photoGrid}>
          <Image source={{ uri: displayPhotos[0].url }} style={[styles.photoImg, styles.mainPhoto]} />
          {displayPhotos.length > 1 && (
            <View style={styles.sidePhotos}>
              <View style={styles.sidePhoto}>
                <Image source={{ uri: displayPhotos[1].url }} style={styles.photoImg} />
              </View>
              {displayPhotos.length > 2 && (
                <View style={styles.sidePhoto}>
                  <Image source={{ uri: displayPhotos[2].url }} style={styles.photoImg} />
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyPhotoBox}>
          <Text style={styles.emptyPhotoText}>📸</Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>₹{totalSpend.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{completedTasks}/{totalTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{plan.participantDetails.length}</Text>
            <Text style={styles.statLabel}>Attendees</Text>
          </View>
        </View>

        {/* Attendees */}
        <Text style={styles.sectionTitle}>The Crew</Text>
        <View style={styles.attendeeRow}>
          {plan.participantDetails.map((p) => (
            <View key={p.uid}>
              {p.photoUrl ? (
                <Image source={{ uri: p.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with Harbor 🧡</Text>
      </View>
    </View>
  );
}