// src/components/partner/PartnerListCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { PartnerCandidate } from "../../types/partner";
import TrustBadge from "../common/TrustBadge";
import { getActivityMeta } from "../../constants/activities";
import { PlanActivity } from "../../types/plan";
import { useTheme } from "../../theme/ThemeContext";
import { ThemeColors } from "../../theme/colors";

interface Props {
  candidate: PartnerCandidate;
  onPress: () => void;
}

export default function PartnerListCard({ candidate, onPress }: Props) {
  const { colors } = useTheme();
  const shared = candidate.sharedActivities || [];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        {candidate.photoUrl ? (
          <Image source={{ uri: candidate.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.bgSubtle }]}>
            <Text style={[styles.initial, { color: colors.textMuted }]}>
              {candidate.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {candidate.name}, {candidate.age}
            </Text>
            {candidate.isVerified && <TrustBadge type="verified" size="sm" />}
          </View>

          <Text style={[styles.city, { color: colors.textSecondary }]}>
            📍 {candidate.city}
          </Text>

          {/* Trust Badge */}
          {candidate.trustBalance !== undefined && (
            <View style={{ marginTop: 6 }}>
              <TrustBadge type="trust_score" value={candidate.trustBalance} size="sm" />
            </View>
          )}

          {/* Shared Activities */}
          {shared.length > 0 && (
            <View style={styles.chipRow}>
              {shared.slice(0, 2).map((a) => {
                const meta = getActivityMeta(a as PlanActivity);
                return (
                  <View key={a} style={[styles.chip, { backgroundColor: colors.primarySubtle }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]}>
                      {meta.emoji} {meta.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 14,
  },
  avatarFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  initial: {
    fontSize: 28,
    fontWeight: "800",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    flexShrink: 1,
  },
  city: {
    fontSize: 13,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});