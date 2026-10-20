// src/components/poll/DatePollCard.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { usePoll } from "../../hooks/usePoll";
import {
  castVote,
  confirmSlot,
  closePoll,
  reopenPoll,
} from "../../services/pollService";
import {
  VoteChoice,
  PollSlot,
  getRecommendedSlotIds,
  getConsensusScore,
  isMajorityNo,
} from "../../types/poll";
import { TimeBlockRanges } from "../../types/user";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";
import AvailabilityHeatmap from "./AvailabilityHeatmap";
import NudgeSection from "./NudgeSection";

interface Props {
  pollId: string;
  organizerId: string;
  canVote?: boolean;
  participantUids?: string[];
  organizerRanges?: TimeBlockRanges;
  hasExistingDate?: boolean;
}

function formatSlotLocal(slot: PollSlot): { date: string; time: string } {
  const start = slot.startAt.toDate();
  const end = slot.endAt.toDate();
  const dateStr = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = `${start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
  return { date: dateStr, time: timeStr };
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.bgElevated,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    title: { fontSize: 16, fontWeight: "800", color: c.text },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
    slotRow: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginVertical: 4,
      borderWidth: 1.5,
      borderColor: "transparent",
      backgroundColor: c.bgSubtle,
    },
    slotRowRecommended: {
      borderColor: c.success,
      backgroundColor: c.success + "11",
    },
    slotTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    slotDate: { fontSize: 14, fontWeight: "700", color: c.text },
    slotTime: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    recommendedBadge: {
      backgroundColor: c.success + "22",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    recommendedText: { fontSize: 10, fontWeight: "800", color: c.success },
    voteRow: { flexDirection: "row", gap: 8 },
    voteBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: "center",
      backgroundColor: c.bgElevated,
    },
    voteBtnYes: { borderColor: c.success, backgroundColor: c.success + "22" },
    voteBtnMaybe: { borderColor: c.warning, backgroundColor: c.warning + "22" },
    voteBtnNo: { borderColor: c.danger, backgroundColor: c.danger + "22" },
    voteLabel: { fontSize: 12, fontWeight: "700", color: c.textSecondary },
    voteLabelActive: { color: c.text },
    tally: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
      flexWrap: "wrap",
    },
    tallyItem: { fontSize: 11, color: c.textSecondary, fontWeight: "600" },
    tallyYes: { color: c.success },
    tallyMaybe: { color: c.warning },
    tallyNo: { color: c.danger },
    actionsRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    actionBtn: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    ghostBtn: { borderWidth: 1.5, borderColor: c.border },
    ghostBtnText: { color: c.text, fontWeight: "700", fontSize: 13 },
    warning: {
      backgroundColor: c.danger + "15",
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    warningText: { color: c.danger, fontSize: 13, lineHeight: 18, fontWeight: "600" },
    muted: { fontSize: 12, color: c.textMuted, textAlign: "center", paddingVertical: 12 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 24,
    },
    modalContent: {
      backgroundColor: c.bg,
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 8 },
    modalDesc: { fontSize: 13, color: c.textSecondary, marginBottom: 16, lineHeight: 18 },
    modalInput: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 12,
      minHeight: 80,
      padding: 12,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.bgSubtle,
      textAlignVertical: "top",
      marginBottom: 16,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "flex-end",
    },
    modalCancel: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    modalCancelText: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
    modalConfirm: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    modalConfirmText: { fontSize: 14, fontWeight: "700", color: c.textInverse },
  });

export default function DatePollCard({
  pollId,
  organizerId,
  canVote = true,
  participantUids = [],
  organizerRanges,
  hasExistingDate = false,
}: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { poll, myVotes, loading, needsNewPoll, totalVotes } = usePoll(
    pollId,
    user?.uid ?? null
  );

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [overrideModal, setOverrideModal] = useState<{ slotId: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const isOrganizer = user?.uid === organizerId;
  const totalMembers = participantUids.length || totalVotes || 1;

  const recommendedSlotIds = useMemo(() => {
    if (!poll || poll.status !== "open") return [];
    return getRecommendedSlotIds(poll.slots, poll.voteCounts || {}, totalMembers);
  }, [poll, totalMembers]);

  const statusPill = useMemo(() => {
    if (!poll) return null;
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      open: { bg: colors.primary + "22", fg: colors.primary, label: "OPEN" },
      closed: { bg: colors.success + "22", fg: colors.success, label: "CLOSED" },
      expired: { bg: colors.textMuted + "22", fg: colors.textMuted, label: "EXPIRED" },
    };
    return map[poll.status];
  }, [poll, colors]);

  const handleVote = async (slotId: string, choice: VoteChoice) => {
    if (!user?.uid || !poll) return;
    if (!canVote) {
      Alert.alert("Observer", "You're viewing this poll as an observer.");
      return;
    }
    try {
      await castVote(poll.id, user.uid, slotId, choice);
    } catch (e: any) {
      Alert.alert("Couldn't save vote", e?.message ?? "Try again.");
    }
  };

  const executeConfirm = async (slotId: string, reason?: string) => {
    if (!user?.uid) return;
    try {
      await confirmSlot(pollId, slotId, user.uid, reason);
      Alert.alert("Slot confirmed! 🎉", "All members have been notified.");
    } catch (e: any) {
      Alert.alert("Couldn't confirm", e?.message ?? "Try again.");
    }
  };

  const handleConfirm = (slotId: string) => {
    if (!poll) return;
    
    const counts = poll.voteCounts?.[slotId] || { yes: 0, maybe: 0, no: 0 };
    const majorityNo = isMajorityNo(slotId, poll.voteCounts || {}, totalMembers);
    const score = getConsensusScore(slotId, poll.voteCounts || {}, totalMembers);
    const isLowConsensus = score < 0.5;

    if (hasExistingDate) {
      setOverrideModal({ slotId });
      return;
    }

    if (majorityNo) {
      Alert.alert(
        "Majority said NO",
        `More than half the squad voted "No" for this slot (${counts.no} No vs ${counts.yes} Yes). Are you sure you want to confirm it?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm anyway", style: "destructive", onPress: () => executeConfirm(slotId) },
        ]
      );
      return;
    }

    if (isLowConsensus) {
      Alert.alert(
        "Low Consensus",
        "This slot doesn't have strong support from the squad. Do you still want to lock it in?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: () => executeConfirm(slotId) },
        ]
      );
      return;
    }

    if (Platform.OS === "web") {
      // @ts-ignore
      if (window.confirm("Confirm this slot as the final date?")) executeConfirm(slotId);
    } else {
      Alert.alert("Confirm slot?", "This closes the poll and sets the plan's date.", [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => executeConfirm(slotId) },
      ]);
    }
  };

  const handleClose = async () => {
    if (!user?.uid) return;
    try {
      await closePoll(pollId, user.uid);
    } catch (e: any) {
      Alert.alert("Couldn't close poll", e?.message ?? "Try again.");
    }
  };

  const handleReopen = async () => {
    if (!user?.uid) return;
    try {
      await reopenPoll(pollId, user.uid);
    } catch (e: any) {
      Alert.alert("Couldn't re-open poll", e?.message ?? "Try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>This poll is no longer available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>📅 Find a date</Text>
        {statusPill && (
          <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
            <Text style={[styles.statusText, { color: statusPill.fg }]}>
              {statusPill.label}
            </Text>
          </View>
        )}
      </View>

      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
        {totalVotes} vote{totalVotes === 1 ? "" : "s"} ·{" "}
        {isOrganizer ? "You are the organizer" : "Vote on the slots below"}
      </Text>

      {/* Slots */}
      {poll.slots.map((slot) => {
        const { date, time } = formatSlotLocal(slot);
        const counts = poll.voteCounts?.[slot.id] || { yes: 0, maybe: 0, no: 0 };
        const my = myVotes?.[slot.id];
        const isConfirmed = poll.confirmedSlotId === slot.id;
        const isRecommended = recommendedSlotIds.includes(slot.id);

        return (
          <View
            key={slot.id}
            style={[
              styles.slotRow,
              isRecommended && poll.status === "open" && styles.slotRowRecommended,
              isConfirmed && { borderColor: colors.success, borderWidth: 2 },
            ]}
          >
            <View style={styles.slotTop}>
              <View>
                <Text style={styles.slotDate}>
                  {date} {isConfirmed ? "✅" : ""}
                </Text>
                <Text style={styles.slotTime}>{time}</Text>
              </View>
              
              {isRecommended && poll.status === "open" && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>⭐ Recommended</Text>
                </View>
              )}
            </View>

            {poll.status === "open" && (
              <View style={styles.voteRow}>
                <TouchableOpacity
                  style={[styles.voteBtn, my === "yes" && styles.voteBtnYes]}
                  onPress={() => handleVote(slot.id, "yes")}
                >
                  <Text style={[styles.voteLabel, my === "yes" && styles.voteLabelActive]}>
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voteBtn, my === "maybe" && styles.voteBtnMaybe]}
                  onPress={() => handleVote(slot.id, "maybe")}
                >
                  <Text style={[styles.voteLabel, my === "maybe" && styles.voteLabelActive]}>
                    Maybe
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voteBtn, my === "no" && styles.voteBtnNo]}
                  onPress={() => handleVote(slot.id, "no")}
                >
                  <Text style={[styles.voteLabel, my === "no" && styles.voteLabelActive]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.tally}>
              <Text style={[styles.tallyItem, styles.tallyYes]}>✓ {counts.yes}</Text>
              <Text style={[styles.tallyItem, styles.tallyMaybe]}>~ {counts.maybe}</Text>
              <Text style={[styles.tallyItem, styles.tallyNo]}>✕ {counts.no}</Text>
            </View>

            {isOrganizer && poll.status === "open" && (
              <TouchableOpacity
                style={[
                  styles.voteBtn,
                  {
                    marginTop: 8,
                    borderColor: isRecommended ? colors.success : colors.primary,
                    backgroundColor: isRecommended ? colors.success + "15" : "transparent",
                  },
                ]}
                onPress={() => handleConfirm(slot.id)}
              >
                <Text
                  style={[
                    styles.voteLabel,
                    { color: isRecommended ? colors.success : colors.primary, fontWeight: "800" },
                  ]}
                >
                  {isRecommended ? "Lock in this slot ⭐" : "Confirm this slot"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* ─── Task 5: Nudge Non-Voters ─── */}
      {poll.status === "open" && (
        <NudgeSection
          pollId={pollId}
          organizerId={organizerId}
          participantUids={participantUids}
        />
      )}

      {/* Organizer tools */}
      {isOrganizer && (
        <View style={styles.actionsRow}>
          {poll.status === "open" && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.ghostBtn]}
                onPress={() => setShowHeatmap(true)}
              >
                <Text style={styles.ghostBtnText}>🗺️ Heatmap</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.ghostBtn]}
                onPress={handleClose}
              >
                <Text style={styles.ghostBtnText}>Close poll</Text>
              </TouchableOpacity>
            </>
          )}
          {poll.status === "closed" && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.ghostBtn, { flex: 1 }]}
              onPress={handleReopen}
            >
              <Text style={styles.ghostBtnText}>Re-open poll</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isOrganizer && needsNewPoll && poll.status === "open" && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ⚠️ Every slot has more "No" votes than Yes+Maybe. Consider creating
            a new poll with different dates.
          </Text>
        </View>
      )}

      <AvailabilityHeatmap
        visible={showHeatmap}
        onClose={() => setShowHeatmap(false)}
        poll={poll}
        participantUids={participantUids}
        organizerRanges={organizerRanges}
      />

      {/* Override Reason Modal */}
      <Modal visible={!!overrideModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Override existing date?</Text>
            <Text style={styles.modalDesc}>
              This Plan already has a scheduled date. Please provide a brief
              reason for the change so the crew knows why.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Venue cancelled, moving to Sunday."
              placeholderTextColor={colors.textMuted}
              value={overrideReason}
              onChangeText={setOverrideReason}
              multiline
              maxLength={200}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setOverrideModal(null);
                  setOverrideReason("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  if (!overrideReason.trim()) {
                    Alert.alert("Reason required", "Please type a short reason.");
                    return;
                  }
                  const sid = overrideModal!.slotId;
                  setOverrideModal(null);
                  setOverrideReason("");
                  executeConfirm(sid, overrideReason);
                }}
              >
                <Text style={styles.modalConfirmText}>Confirm change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}