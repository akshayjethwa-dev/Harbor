import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { Plan } from "../../types/plan";
import { getActivityMeta } from "../../constants/activities";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

function formatDate(ts: any): string {
  if (!ts) return "TBD";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatTime(ts: any): string {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.bgElevated,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    banner: {
      height: 110,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    emoji: { fontSize: 56 },
    badgeRow: {
      position: "absolute",
      top: 10,
      left: 10,
      flexDirection: "row",
      gap: 6,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
    body: { padding: 14 },
    title: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
      marginBottom: 6,
    },
    metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    meta: { fontSize: 13, color: c.textSecondary },
    metaDot: { marginHorizontal: 6, color: c.textMuted },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    hostRow: { flexDirection: "row", alignItems: "center", flex: 1 },
    hostAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 8,
    },
    hostAvatarFallback: {
      backgroundColor: c.bgSubtle,
      justifyContent: "center",
      alignItems: "center",
    },
    hostInitial: { fontSize: 14, fontWeight: "700", color: c.textMuted },
    hostName: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      maxWidth: 100,
    },
    hostScore: { fontSize: 11, color: c.textMuted },
    spots: { fontSize: 12, color: c.primary, fontWeight: "700" },
  });

export default function PlanCard({ plan }: { plan: Plan }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const act = getActivityMeta(plan.activity);

  const spotsLabel =
    plan.capacity === 0
      ? `${plan.spotsFilled} joined`
      : plan.spotsFilled >= plan.capacity
      ? "Full + waitlist"
      : `${plan.capacity - plan.spotsFilled} of ${plan.capacity} spots left`;

  const priceLabel =
    plan.costTotal > 0 ? `₹${plan.costPerPerson}/person` : "Free";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({ pathname: "/plan/[id]", params: { id: plan.id } })
      }
      activeOpacity={0.85}
    >
      <View style={[styles.banner, { backgroundColor: act.color + "22" }]}>
        <Text style={styles.emoji}>{act.emoji}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: act.color }]}>
            <Text style={styles.badgeText}>{act.label}</Text>
          </View>
          {plan.costTotal > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.success }]}>
              <Text style={styles.badgeText}>{priceLabel}</Text>
            </View>
          )}
          {plan.requirements.verifiedOnly && (
            <View style={[styles.badge, { backgroundColor: colors.info }]}>
              <Text style={styles.badgeText}>✓ Verified</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {plan.title}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>📅 {formatDate(plan.startTime)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{formatTime(plan.startTime)}</Text>
        </View>

        <Text style={styles.meta}>
          📍 {plan.locationName}, {plan.city}
        </Text>

        <View style={styles.divider} />

        <View style={styles.footer}>
          <View style={styles.hostRow}>
            {plan.hostPhotoUrl ? (
              <Image
                source={{ uri: plan.hostPhotoUrl }}
                style={styles.hostAvatar}
              />
            ) : (
              <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                <Text style={styles.hostInitial}>
                  {plan.hostName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.hostName} numberOfLines={1}>
                {plan.hostName}
              </Text>
              <Text style={styles.hostScore}>⭐ Host {plan.hostScore}</Text>
            </View>
          </View>
          <Text style={styles.spots}>{spotsLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}