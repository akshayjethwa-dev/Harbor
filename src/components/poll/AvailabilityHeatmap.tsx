// src/components/poll/AvailabilityHeatmap.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  DatePoll,
  PollSlot,
  SlotHeatmapDetail,
  SlotHeatmapMember,
  HeatmapStatus,
} from "../../types/poll";
import { useSquadAvailability } from "../../hooks/useSquadAvailability";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";
import { TimeBlockRanges } from "../../types/user";

interface Props {
  visible: boolean;
  onClose: () => void;
  poll: DatePoll;
  participantUids: string[];
  organizerRanges?: TimeBlockRanges;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatSlotLocal(slot: PollSlot): { date: string; time: string } {
  const start = slot.startAt.toDate();
  const end = slot.endAt.toDate();
  return {
    date: start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: `${start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })} – ${end.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`,
  };
}

const STATUS_META: Record<
  HeatmapStatus,
  { emoji: string; label: string; bgKey: "success" | "warning" | "danger" | "textMuted" }
> = {
  all_free: { emoji: "🟢", label: "All free", bgKey: "success" },
  some_conflicts: { emoji: "🟡", label: "Some conflicts", bgKey: "warning" },
  major_conflicts: { emoji: "🔴", label: "Major conflicts", bgKey: "danger" },
  unknown: { emoji: "⚪", label: "Unknown", bgKey: "textMuted" },
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      maxHeight: "92%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: 12,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: { fontSize: 20, fontWeight: "800", color: c.text },
    closeBtn: {
      padding: 8,
      marginRight: -8,
    },
    closeText: { fontSize: 20, color: c.textMuted },
    scroll: { paddingHorizontal: 20 },
    loadingBox: { paddingVertical: 40, alignItems: "center" },
    
    // Task 41: View Toggle
    toggleRow: { flexDirection: "row", justifyContent: "center", paddingVertical: 12 },
    toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: c.border, marginHorizontal: 4 },
    toggleBtnActive: { backgroundColor: c.primary + "11", borderColor: c.primary },
    toggleText: { fontSize: 13, fontWeight: "700", color: c.textSecondary },
    toggleTextActive: { color: c.primary },

    row: {
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    rowDate: { fontSize: 14, fontWeight: "700", color: c.text },
    rowTime: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    pillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
    countsRow: {
      flexDirection: "row",
      gap: 14,
      marginTop: 8,
    },
    count: { fontSize: 12, color: c.textSecondary, fontWeight: "700" },
    countFree: { color: c.success },
    countMaybe: { color: c.warning },
    countBusy: { color: c.danger },
    countUnknown: { color: c.textMuted },
    
    // Task 41: List View Styles
    listSection: { marginTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    listTitle: { fontSize: 16, fontWeight: "800", color: c.text, marginBottom: 4 },
    listSubtitle: { fontSize: 13, color: c.textSecondary, marginBottom: 12 },

    // Detail overlay
    detailBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      padding: 20,
    },
    detailCard: {
      backgroundColor: c.bg,
      borderRadius: 20,
      padding: 20,
      maxHeight: "80%",
    },
    detailTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 4 },
    detailSub: { fontSize: 12, color: c.textSecondary, marginBottom: 16 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 8,
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      gap: 10,
    },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    avatarFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.bgSubtle,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarInitial: { fontSize: 13, fontWeight: "700", color: c.textMuted },
    memberName: { fontSize: 14, fontWeight: "600", color: c.text },
    emptyLine: { fontSize: 13, color: c.textMuted, fontStyle: "italic", paddingVertical: 6 },
    nudgeBox: {
      backgroundColor: c.warning + "22",
      padding: 14,
      borderRadius: 12,
      marginTop: 12,
    },
    nudgeText: { fontSize: 13, color: c.text, lineHeight: 19 },
    closeAction: {
      marginTop: 20,
      height: 48,
      borderRadius: 12,
      backgroundColor: c.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    closeActionText: { color: c.textInverse, fontWeight: "700", fontSize: 15 },
  });

export default function AvailabilityHeatmap({
  visible,
  onClose,
  poll,
  participantUids,
  organizerRanges,
}: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { members, loading, load, computeHeatmap } = useSquadAvailability();
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Load members when modal opens
  useEffect(() => {
    if (visible) {
      load(participantUids);
    }
  }, [visible, participantUids, load]);

  // Organizer's UTC offset
  const organizerOffset = useMemo(
    () => -new Date().getTimezoneOffset(),
    [visible]
  );

  // Compute per-slot details
  const heatmap = useMemo(
    () => computeHeatmap(poll, organizerOffset, organizerRanges),
    [poll, organizerOffset, organizerRanges, computeHeatmap]
  );

  const allUnknown = useMemo(() => {
    if (!poll.slots?.length) return false;
    return poll.slots.every((s) => heatmap[s.id]?.status === "unknown");
  }, [poll, heatmap]);

  const openSlotDetail = useMemo((): SlotHeatmapDetail | null => {
    if (!openSlotId || !heatmap[openSlotId]) return null;
    return heatmap[openSlotId];
  }, [openSlotId, heatmap]);

  const openSlot = useMemo((): PollSlot | null => {
    if (!openSlotId) return null;
    return poll.slots.find((s) => s.id === openSlotId) ?? null;
  }, [openSlotId, poll.slots]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Availability heatmap</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close heatmap">
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Task 41: View Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === "grid" && styles.toggleBtnActive]} onPress={() => setViewMode("grid")}>
              <Text style={[styles.toggleText, viewMode === "grid" && styles.toggleTextActive]}>Grid View</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]} onPress={() => setViewMode("list")}>
              <Text style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}>List View</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ marginTop: 8, color: colors.textSecondary }}>
                  Loading squad availability…
                </Text>
              </View>
            ) : (
              <>
                {allUnknown && (
                  <View style={styles.nudgeBox}>
                    <Text style={styles.nudgeText}>
                      💡 No one in this squad has set their weekly availability
                      yet. Send them a nudge from Profile → Availability so the
                      heatmap can light up.
                    </Text>
                  </View>
                )}

                {/* Grid View (Default) */}
                {viewMode === "grid" && poll.slots.map((slot) => {
                  const detail: SlotHeatmapDetail = heatmap[slot.id];
                  if (!detail) return null;
                  const meta = STATUS_META[detail.status];
                  const metaColor = (colors as any)[meta.bgKey] as string;
                  const { date, time } = formatSlotLocal(slot);

                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={styles.row}
                      activeOpacity={0.75}
                      onPress={() => setOpenSlotId(slot.id)}
                      accessible={true}
                      accessibilityLabel={`${date} ${time}. Status: ${meta.label}. ${detail.free.length} free, ${detail.busy.length} busy.`}
                    >
                      <View style={styles.rowHeader}>
                        <View>
                          <Text style={styles.rowDate}>{date}</Text>
                          <Text style={styles.rowTime}>{time}</Text>
                        </View>
                        <View style={[styles.pill, { backgroundColor: metaColor + "22" }]}>
                          <Text style={[styles.pillText, { color: metaColor }]}>{meta.emoji} {meta.label}</Text>
                        </View>
                      </View>
                      <View style={styles.countsRow}>
                        <Text style={[styles.count, styles.countFree]}>✓ {detail.free.length} free</Text>
                        <Text style={[styles.count, styles.countMaybe]}>~ {detail.maybe.length} maybe</Text>
                        <Text style={[styles.count, styles.countBusy]}>✕ {detail.busy.length} busy</Text>
                        <Text style={[styles.count, styles.countUnknown]}>? {detail.unknown.length} unknown</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Task 41: List View (Alternative for Screen Readers) */}
                {viewMode === "list" && poll.slots.map((slot) => {
                  const detail = heatmap[slot.id];
                  if (!detail) return null;
                  const { date, time } = formatSlotLocal(slot);
                  const meta = STATUS_META[detail.status];

                  return (
                    <View key={slot.id} style={styles.listSection}>
                      <Text style={styles.listTitle}>{date} @ {time}</Text>
                      <Text style={styles.listSubtitle}>Overall: {meta.label}</Text>
                      
                      {detail.free.length > 0 && (
                        <View>
                          <Text style={[styles.sectionLabel, { color: colors.success }]}>Free ({detail.free.length})</Text>
                          {detail.free.map(m => <Text key={m.uid} style={styles.memberName}>• {m.name}</Text>)}
                        </View>
                      )}
                      
                      {detail.maybe.length > 0 && (
                        <View>
                          <Text style={[styles.sectionLabel, { color: colors.warning }]}>Maybe ({detail.maybe.length})</Text>
                          {detail.maybe.map(m => <Text key={m.uid} style={styles.memberName}>• {m.name}</Text>)}
                        </View>
                      )}

                      {detail.busy.length > 0 && (
                        <View>
                          <Text style={[styles.sectionLabel, { color: colors.danger }]}>Busy ({detail.busy.length})</Text>
                          {detail.busy.map(m => <Text key={m.uid} style={styles.memberName}>• {m.name}</Text>)}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Per-slot detail modal */}
      <Modal
        visible={!!openSlotDetail}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenSlotId(null)}
      >
        <View style={styles.detailBackdrop}>
          <View style={styles.detailCard}>
            {openSlot && (
              <>
                <Text style={styles.detailTitle}>
                  {formatSlotLocal(openSlot).date}
                </Text>
                <Text style={styles.detailSub}>
                  {formatSlotLocal(openSlot).time}
                </Text>
              </>
            )}

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.sectionLabel}>
                Free ({openSlotDetail?.free.length ?? 0})
              </Text>
              {openSlotDetail && openSlotDetail.free.length > 0 ? (
                openSlotDetail.free.map((m: SlotHeatmapMember) => (
                  <MemberRow key={m.uid} member={m} />
                ))
              ) : (
                <Text style={styles.emptyLine}>No one</Text>
              )}

              <Text style={styles.sectionLabel}>
                Maybe ({openSlotDetail?.maybe.length ?? 0})
              </Text>
              {openSlotDetail && openSlotDetail.maybe.length > 0 ? (
                openSlotDetail.maybe.map((m: SlotHeatmapMember) => (
                  <MemberRow key={m.uid} member={m} />
                ))
              ) : (
                <Text style={styles.emptyLine}>No one</Text>
              )}

              <Text style={styles.sectionLabel}>
                Busy ({openSlotDetail?.busy.length ?? 0})
              </Text>
              {openSlotDetail && openSlotDetail.busy.length > 0 ? (
                openSlotDetail.busy.map((m: SlotHeatmapMember) => (
                  <MemberRow key={m.uid} member={m} />
                ))
              ) : (
                <Text style={styles.emptyLine}>No one</Text>
              )}

              <Text style={styles.sectionLabel}>
                Unknown ({openSlotDetail?.unknown.length ?? 0})
              </Text>
              {openSlotDetail && openSlotDetail.unknown.length > 0 ? (
                openSlotDetail.unknown.map((m: SlotHeatmapMember) => (
                  <MemberRow key={m.uid} member={m} />
                ))
              ) : (
                <Text style={styles.emptyLine}>No one</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeAction}
              onPress={() => setOpenSlotId(null)}
            >
              <Text style={styles.closeActionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Small internal component
// ─────────────────────────────────────────────
function MemberRow({
  member,
}: {
  member: SlotHeatmapMember;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.memberRow}>
      {member.photoUrl ? (
        <Image source={{ uri: member.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.memberName}>{member.name}</Text>
    </View>
  );
}