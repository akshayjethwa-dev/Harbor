// src/components/trust/TrustScoreBreakdownSheet.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { ThemeColors } from "../../theme/colors";

interface TrustBreakdownProps {
  visible: boolean;
  onClose: () => void;
  showUpRate: number; // Percentage (0-100)
  hostRating: number; // Out of 5
  guestRating: number; // Out of 5
}

export default function TrustScoreBreakdownSheet({
  visible,
  onClose,
  showUpRate,
  hostRating,
  guestRating,
}: TrustBreakdownProps) {
  const { colors } = useTheme();
  const [showTips, setShowTips] = useState(false);

  // Determine the lowest dimension to offer targeted tips
  const dimensions = [
    { key: "showUp", value: showUpRate / 20, label: "Show-up rate" }, // Normalize 0-100 to 0-5 scale
    { key: "host", value: hostRating, label: "Host rating" },
    { key: "guest", value: guestRating, label: "Guest rating" },
  ];
  const lowest = dimensions.reduce((prev, curr) =>
    prev.value < curr.value ? prev : curr
  );
  const needsAttention = lowest.value < 4.0; // Threshold for "Needs attention"

  const renderRow = (
    label: string,
    value: number,
    maxValue: number,
    explanation: string,
    isLowest: boolean
  ) => {
    const isLow = value < maxValue * 0.8; // < 80% threshold

    return (
      <View style={styles.row}>
        <View style={styles.rowHeader}>
          <View style={styles.rowLabelWrap}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
            {isLowest && needsAttention && (
              <View style={[styles.attentionBadge, { backgroundColor: colors.warning + "22" }]}>
                <Text style={[styles.attentionText, { color: colors.warning }]}>
                  Needs attention
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.rowValue, { color: colors.primary }]}>
            {maxValue === 5 ? value.toFixed(1) : `${value}%`}
          </Text>
        </View>
        <Text style={[styles.rowExplanation, { color: colors.textSecondary }]}>
          {explanation}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Trust Breakdown</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Show-up Rate */}
            {renderRow(
              "Show-up rate",
              showUpRate,
              100,
              "How often you attend Plans you've joined.",
              lowest.key === "showUp"
            )}

            {/* Host Rating */}
            {renderRow(
              "Host rating",
              hostRating,
              5,
              "Feedback from guests who attended your hosted Plans.",
              lowest.key === "host"
            )}

            {/* Guest Rating */}
            {renderRow(
              "Guest rating",
              guestRating,
              5,
              "Feedback from hosts you've joined as a guest.",
              lowest.key === "guest"
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* How to improve section */}
            <TouchableOpacity
              style={styles.improveToggle}
              onPress={() => setShowTips(!showTips)}
              activeOpacity={0.7}
            >
              <Text style={[styles.improveTitle, { color: colors.text }]}>
                How to improve
              </Text>
              <Ionicons
                name={showTips ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {showTips && (
              <View style={styles.tipsContainer}>
                {lowest.key === "showUp" && (
                  <>
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      • <Text style={{ fontWeight: "700" }}>Turn on reminders:</Text> Enable push notifications so you never forget a Plan.
                    </Text>
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      • <Text style={{ fontWeight: "700" }}>Leave early:</Text> If your plans change, leave the Plan at least 24 hours in advance to avoid penalties.
                    </Text>
                  </>
                )}
                {lowest.key === "host" && (
                  <>
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      • <Text style={{ fontWeight: "700" }}>Engage guests:</Text> Welcome everyone in the chat and share clear instructions.
                    </Text>
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      • <Text style={{ fontWeight: "700" }}>Be prepared:</Text> Arrive early, have a backup plan, and make sure the venue is confirmed.
                    </Text>
                  </>
                )}
                {lowest.key === "guest" && (
                  <>
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      • <Text style={{ fontWeight: "700" }}>Communicate:</Text> Reply to host messages promptly and confirm your attendance.
                    </Text>
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      • <Text style={{ fontWeight: "700" }}>Be respectful:</Text> Follow the host's rules and be a positive member of the group.
                    </Text>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800" },
  content: { paddingHorizontal: 24 },
  row: {
    marginBottom: 24,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rowLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabel: { fontSize: 16, fontWeight: "700" },
  attentionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  attentionText: { fontSize: 11, fontWeight: "700" },
  rowValue: { fontSize: 20, fontWeight: "800" },
  rowExplanation: { fontSize: 14, lineHeight: 20 },
  divider: { height: 1, marginVertical: 16 },
  improveToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  improveTitle: { fontSize: 16, fontWeight: "700" },
  tipsContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: "#F8F9FA", // Subtle background for tips
    borderRadius: 12,
  },
  tipText: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
});