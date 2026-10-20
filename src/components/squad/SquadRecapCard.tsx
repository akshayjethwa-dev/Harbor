// src/components/squad/SquadRecapCard.tsx
import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  squadName: string;
  year: number;
  totalPlans: number;
  totalSpent: number;
  mostActiveMember: { name: string; photoUrl: string | null; count: number } | null;
  topPhotos: string[];
  mapImageUrl: string | null;
  attendeeAvatars: (string | null)[];
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: c.bg, borderRadius: 24, overflow: "hidden", marginBottom: 24 },
  gradientHeader: { padding: 32, alignItems: "center" },
  yearText: { fontSize: 48, fontWeight: "900", color: "rgba(255,255,255,0.3)", position: "absolute", top: 16, right: 24 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "900", color: "#FFF", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  
  statsContainer: { padding: 24 },
  bigStatsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  bigStatBox: { flex: 1, alignItems: "center", backgroundColor: c.bgElevated, padding: 20, borderRadius: 16, marginHorizontal: 4, borderWidth: 1, borderColor: c.border },
  bigStatValue: { fontSize: 24, fontWeight: "900", color: c.primary, marginBottom: 4 },
  bigStatLabel: { fontSize: 12, color: c.textMuted, fontWeight: "700", textTransform: "uppercase" },

  sectionTitle: { fontSize: 14, fontWeight: "800", color: c.text, marginBottom: 12, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  
  // Most Active Member
  memberCard: { flexDirection: "row", alignItems: "center", backgroundColor: c.bgSubtle, padding: 16, borderRadius: 16, marginBottom: 24 },
  memberAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 16 },
  memberAvatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: c.border, alignItems: "center", justifyContent: "center", marginRight: 16 },
  memberInitial: { fontSize: 20, fontWeight: "800", color: c.textMuted },
  memberName: { fontSize: 18, fontWeight: "800", color: c.text },
  memberCount: { fontSize: 13, color: c.textSecondary, marginTop: 2 },

  // Photos
  photoGrid: { flexDirection: "row", height: 160, gap: 4, marginBottom: 24 },
  photoCol: { flex: 1, gap: 4 },
  photo: { width: "100%", height: "100%", borderRadius: 8, backgroundColor: c.bgSubtle },
  emptyPhoto: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bgSubtle, borderRadius: 12, marginBottom: 24 },
  emptyPhotoText: { fontSize: 40 },

  // Map
  mapContainer: { height: 160, borderRadius: 16, overflow: "hidden", marginBottom: 24, backgroundColor: c.bgSubtle, alignItems: "center", justifyContent: "center" },
  mapImage: { width: "100%", height: "100%", resizeMode: "cover" },
  mapPlaceholder: { fontSize: 40 },

  // Attendees
  attendeeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.bgSubtle, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 12, fontWeight: "700", color: c.textMuted },

  footer: { alignItems: "center", paddingBottom: 24 },
  footerText: { fontSize: 12, color: c.textMuted, fontWeight: "600" },
});

export default function SquadRecapCard({
  squadName, year, totalPlans, totalSpent, mostActiveMember, topPhotos, mapImageUrl, attendeeAvatars
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.card}>
      {/* Header */}
      <LinearGradient colors={["#4A148C", "#E91E63"]} style={styles.gradientHeader}>
        <Text style={styles.yearText}>{year}</Text>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.title}>{squadName}</Text>
        <Text style={styles.subtitle}>Year in Review</Text>
      </LinearGradient>

      <View style={styles.statsContainer}>
        {/* Big Stats */}
        <View style={styles.bigStatsRow}>
          <View style={styles.bigStatBox}>
            <Text style={styles.bigStatValue}>{totalPlans}</Text>
            <Text style={styles.bigStatLabel}>Plans</Text>
          </View>
          <View style={styles.bigStatBox}>
            <Text style={styles.bigStatValue}>₹{totalSpent > 1000 ? (totalSpent / 1000).toFixed(1) + "k" : totalSpent.toFixed(0)}</Text>
            <Text style={styles.bigStatLabel}>Spent</Text>
          </View>
        </View>

        {/* Most Active Member */}
        {mostActiveMember && (
          <>
            <Text style={styles.sectionTitle}>MVP of the Year</Text>
            <View style={styles.memberCard}>
              {mostActiveMember.photoUrl ? (
                <Image source={{ uri: mostActiveMember.photoUrl }} style={styles.memberAvatar} />
              ) : (
                <View style={styles.memberAvatarFallback}>
                  <Text style={styles.memberInitial}>{mostActiveMember.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View>
                <Text style={styles.memberName}>{mostActiveMember.name}</Text>
                <Text style={styles.memberCount}>Attended {mostActiveMember.count} plans</Text>
              </View>
            </View>
          </>
        )}

        {/* Photos */}
        <Text style={styles.sectionTitle}>Top Memories</Text>
        {topPhotos.length > 0 ? (
          <View style={styles.photoGrid}>
            <View style={styles.photoCol}>
              {topPhotos[0] && <Image source={{ uri: topPhotos[0] }} style={styles.photo} />}
              {topPhotos[2] && <Image source={{ uri: topPhotos[2] }} style={styles.photo} />}
            </View>
            <View style={styles.photoCol}>
              {topPhotos[1] && <Image source={{ uri: topPhotos[1] }} style={styles.photo} />}
              {topPhotos[3] && <Image source={{ uri: topPhotos[3] }} style={styles.photo} />}
            </View>
          </View>
        ) : (
          <View style={styles.emptyPhoto}>
            <Text style={styles.emptyPhotoText}>📸</Text>
          </View>
        )}

        {/* Map of Places */}
        <Text style={styles.sectionTitle}>Places We Went</Text>
        <View style={styles.mapContainer}>
          {mapImageUrl ? (
            <Image source={{ uri: mapImageUrl }} style={styles.mapImage} />
          ) : (
            <Text style={styles.mapPlaceholder}>🗺️</Text>
          )}
        </View>

        {/* The Crew */}
        <Text style={styles.sectionTitle}>The Crew</Text>
        <View style={styles.attendeeRow}>
          {attendeeAvatars.map((url, i) => (
            url ? (
              <Image key={i} source={{ uri: url }} style={styles.avatar} />
            ) : (
              <View key={i} style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>?</Text>
              </View>
            )
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