// src/components/profile/BadgeGrid.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Share, Alert } from "react-native";
import { BADGES, BadgeDefinition } from "../../constants/badges";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  badges: string[];
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { marginBottom: 24 },
  title: { fontSize: 16, fontWeight: "800", color: c.text, marginBottom: 12, paddingHorizontal: 24 },
  scrollContent: { paddingHorizontal: 24, gap: 12 },
  badgeCard: { alignItems: "center", width: 72 },
  iconWrapper: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: c.bgElevated,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
    borderWidth: 2, borderColor: c.border,
  },
  icon: { fontSize: 32 },
  badgeName: { fontSize: 11, fontWeight: "700", color: c.textSecondary, textAlign: "center" },
  emptyText: { fontSize: 13, color: c.textMuted, fontStyle: "italic", paddingHorizontal: 24 },

  // Modal Styles
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: c.bg, borderRadius: 24, padding: 32, width: "100%", maxWidth: 340, alignItems: "center" },
  modalIconWrapper: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  modalIcon: { fontSize: 56 },
  modalTitle: { fontSize: 24, fontWeight: "900", color: c.text, marginBottom: 8, textAlign: "center" },
  modalDesc: { fontSize: 15, color: c.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  shareBtn: { backgroundColor: c.primary, width: "100%", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  shareBtnText: { color: c.textInverse, fontWeight: "700", fontSize: 16 },
  closeBtn: { padding: 12 },
  closeBtnText: { color: c.textMuted, fontSize: 15, fontWeight: "600" },
});

export default function BadgeGrid({ badges }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  // Filter the full BADGES list down to only the ones the user has earned
  const earnedBadges = BADGES.filter((b) => badges?.includes(b.id));

  const handleShare = async (badge: BadgeDefinition) => {
    try {
      await Share.share({
        message: `I just earned the "${badge.name}" badge on Kithra! ${badge.icon}\n\n${badge.description}\n\nJoin me on Kithra to plan your next adventure!`,
      });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  if (earnedBadges.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Achievements</Text>
        <Text style={styles.emptyText}>No badges earned yet. Create a plan to get started!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Achievements</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {earnedBadges.map((badge) => (
          <TouchableOpacity key={badge.id} style={styles.badgeCard} onPress={() => setSelectedBadge(badge)}>
            <View style={[styles.iconWrapper, { borderColor: badge.color }]}>
              <Text style={styles.icon}>{badge.icon}</Text>
            </View>
            <Text style={styles.badgeName} numberOfLines={2}>{badge.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Badge Detail/Share Modal */}
      <Modal visible={!!selectedBadge} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            {selectedBadge && (
              <>
                <View style={[styles.modalIconWrapper, { backgroundColor: selectedBadge.color + "22" }]}>
                  <Text style={styles.modalIcon}>{selectedBadge.icon}</Text>
                </View>
                <Text style={styles.modalTitle}>{selectedBadge.name}</Text>
                <Text style={styles.modalDesc}>{selectedBadge.description}</Text>
                
                <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(selectedBadge)}>
                  <Text style={styles.shareBtnText}>Share Achievement</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedBadge(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}