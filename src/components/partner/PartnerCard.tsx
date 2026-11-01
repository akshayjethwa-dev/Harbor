// src/components/partner/PartnerCard.tsx
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { PartnerCandidate } from "../../types/partner";
import { getPartnerVibe } from "../../constants/partnerVibes";
import { getActivityMeta } from "../../constants/activities";
import { PlanActivity } from "../../types/plan";
import TrustBadge from "../common/TrustBadge";

export default function PartnerCard({ candidate }: { candidate: PartnerCandidate }) {
  const vibe = getPartnerVibe(candidate.partnerVibe);

  // Extract up to 2 shared activities
  const sharedActivities = candidate.sharedActivities || [];

  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        {candidate.photoUrl ? (
          <Image source={{ uri: candidate.photoUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.initial}>
              {candidate.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Verification Tick (Overlaid) */}
        {candidate.isVerified && (
          <View style={styles.verifiedBadge}>
            <TrustBadge type="verified" size="md" />
          </View>
        )}

        {vibe && (
          <View style={styles.vibeBadge}>
            <Text style={styles.vibeText}>
              {vibe.emoji} {vibe.label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {candidate.name}, {candidate.age}
          </Text>
          
          {/* Trust Chip */}
          {candidate.trustBalance !== undefined && (
            <TrustBadge 
              type="trust_score" 
              value={candidate.trustBalance} 
              size="sm" 
            />
          )}
        </View>

        <Text style={styles.city}>📍 {candidate.city}</Text>

        {candidate.bio ? (
          <Text style={styles.bio} numberOfLines={3}>
            {candidate.bio}
          </Text>
        ) : null}

        {/* Shared Activities (Mutual Interests) */}
        {sharedActivities.length > 0 && (
          <View style={styles.sharedContainer}>
            <Text style={styles.sharedLabel}>Shared interests:</Text>
            <View style={styles.chipRow}>
              {sharedActivities.slice(0, 2).map((a) => {
                const meta = getActivityMeta(a as PlanActivity);
                return (
                  <View key={a} style={styles.sharedChip}>
                    <Text style={styles.sharedChipText}>
                      {meta.emoji} {meta.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Standard Activities */}
        {candidate.activities && candidate.activities.length > 0 && (
          <View style={styles.chipRow}>
            {candidate.activities.slice(0, 4).map((a) => {
              if (sharedActivities.includes(a)) return null;
              const meta = getActivityMeta(a as PlanActivity);
              return (
                <View key={a} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {meta.emoji} {meta.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  imageWrap: { position: "relative", height: 340, backgroundColor: "#F0F0F0" },
  image: { width: "100%", height: "100%" },
  imageFallback: { justifyContent: "center", alignItems: "center" },
  initial: { fontSize: 96, fontWeight: "800", color: "#CCC" },
  verifiedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    // Added a subtle white background behind the badge so it pops on photos
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    padding: 2,
  },
  vibeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(233,30,99,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  vibeText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
  body: { padding: 18 },
  nameRow: { 
    flexDirection: "row", 
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: { fontSize: 22, fontWeight: "800", color: "#1A1A1A", flex: 1, marginRight: 8 },
  city: { fontSize: 13, color: "#666", marginTop: 4 },
  bio: { fontSize: 14, color: "#444", marginTop: 10, lineHeight: 20 },
  sharedContainer: {
    marginTop: 12,
  },
  sharedLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sharedChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#FFF0F5",
    borderWidth: 1,
    borderColor: "#F8BBD0",
  },
  sharedChipText: { fontSize: 12, color: "#E91E63", fontWeight: "700" },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  chipText: { fontSize: 12, color: "#333", fontWeight: "600" },
});