// src/components/discover/PickCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme/ThemeContext";
import { Recommendation } from "../../services/recommendationService";
import { Plan } from "../../types/plan";
import { PartnerCandidate } from "../../types/partner";

interface Props {
  recommendation: Recommendation;
  onDismiss: () => void;
  onWhyThis: () => void;
}

export default function PickCard({ recommendation, onDismiss, onWhyThis }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  const isPlan = recommendation.type === "plan";
  const data = recommendation.data as Plan | PartnerCandidate;

  // Extract display fields based on type
  const title = isPlan ? (data as Plan).title : (data as PartnerCandidate).name;
  const subtitle = isPlan
    ? `${(data as Plan).activity} • ${(data as Plan).city}`
    : `${(data as PartnerCandidate).age} • ${(data as PartnerCandidate).city}`;
  const imageUrl = isPlan ? (data as Plan).hostPhotoUrl : (data as PartnerCandidate).photoUrl;

  const handlePress = () => {
    if (isPlan) {
      router.push(`/plan/${recommendation.id}` as any);
    } else {
      router.push(`/partner/profile/${recommendation.id}` as any);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.bgSubtle }]}>
            <Text style={[styles.initial, { color: colors.textMuted }]}>
              {title?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
          <Text style={[styles.reason, { color: colors.primary }]} numberOfLines={1}>
            ✨ {recommendation.reason}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Text style={{ color: colors.textMuted, fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onWhyThis} style={styles.whyBtn}>
        <Text style={[styles.whyText, { color: colors.textMuted }]}>Why this?</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  initial: { fontSize: 24, fontWeight: "700" },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  subtitle: { fontSize: 13, marginBottom: 2 },
  reason: { fontSize: 12, fontWeight: "600" },
  dismissBtn: { padding: 8 },
  whyBtn: { alignSelf: "flex-start", marginTop: 8 },
  whyText: { fontSize: 12, fontWeight: "600", textDecorationLine: "underline" },
});