// app/squad/[id].tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  getSquad,
  getSquadRole,
  removeMember,
  promoteToCoAdmin,
  leaveSquad,
  forkSquad,
  archiveSquad,
} from "../../src/services/squadService";
import { Squad, DAY_NAMES } from "../../src/types/squad";
import { getActivityMeta } from "../../src/constants/activities";
import SOSButton from "../../src/components/safety/SOSButton";
import LiveLocationToggle from "../../src/components/safety/LiveLocationToggle";

export default function SquadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [squad, setSquad] = useState<Squad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removeModal, setRemoveModal] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const s = await getSquad(id);
      if (!s) setError("Squad not found");
      else setSquad(s);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (error || !squad) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={{ fontSize: 48 }}>😕</Text>
        <Text style={styles.errorText}>{error ?? "Squad not found"}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const act = getActivityMeta(squad.activity);
  const myRole = user ? getSquadRole(squad, user.uid) : "visitor";
  const isAdmin = myRole === "admin";
  const isCoAdmin = myRole === "co_admin";
  const canManage = isAdmin || isCoAdmin;
  
  // Task 54: Host Tier Check
  const isHostTier = user?.subscriptionTier === "host";

  const handlePromote = async (uid: string) => {
    try {
      await promoteToCoAdmin(squad.id, uid);
      await load();
      Alert.alert("Promoted", "Member is now a co-admin.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeModal) return;
    if (!removeReason.trim()) {
      Alert.alert("Reason required", "Please provide a reason for removal.");
      return;
    }
    try {
      await removeMember(squad.id, removeModal, removeReason.trim());
      setRemoveModal(null);
      setRemoveReason("");
      await load();
      Alert.alert("Removed", "Member has been removed.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave Squad?",
      isAdmin
        ? "As admin, leaving will promote your first co-admin. If you have none, the Squad will be archived."
        : "You'll lose access to this Squad's chat and upcoming Plans.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveSquad(squad.id, user!.uid);
              router.replace("/(tabs)/squads" as any);
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  const handleFork = () => {
    Alert.alert(
      "Fork Squad?",
      "This creates a new Squad with all members (except the current admin). The original Squad will be archived. Use this if the admin has disappeared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Fork",
          style: "destructive",
          onPress: async () => {
            try {
              const newId = await forkSquad(squad.id, user!.uid);
              router.replace({
                pathname: "/squad/[id]",
                params: { id: newId },
              });
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  const handleArchive = () => {
    Alert.alert(
      "Archive Squad?",
      "Members will no longer see this Squad. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveSquad(squad.id, "Archived by admin");
              router.replace("/(tabs)/squads" as any);
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  const handleInvite = () => {
    router.push({
      pathname: "/invite/create" as any,
      params: {
        type: "squad",
        targetId: squad.id,
        targetTitle: squad.name,
        targetActivity: squad.activity,
        existingMembers: squad.memberUids.join(","),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: act.color + "22" }]}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <Text style={styles.backIconText}>←</Text>
          </TouchableOpacity>
          {squad.coverImageUrl ? (
            <Image
              source={{ uri: squad.coverImageUrl }}
              style={styles.heroImage}
            />
          ) : (
            <Text style={styles.heroEmoji}>{act.emoji}</Text>
          )}
          <View style={[styles.heroTag, { backgroundColor: act.color }]}>
            <Text style={styles.heroTagText}>{act.label}</Text>
          </View>
        </View>

        {/* ✅ Safety toolbar */}
        {myRole !== "visitor" && (
          <View style={styles.safetyBar}>
            <LiveLocationToggle scopeType="squad" scopeId={squad.id} />
            <SOSButton squadId={squad.id} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{squad.name}</Text>
          {squad.description ? (
            <Text style={styles.desc}>{squad.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={styles.meta}>📍 {squad.city}</Text>
            <Text style={styles.meta}>👥 {squad.memberUids.length} members</Text>
          </View>

          {squad.recurring?.enabled && (
            <View style={styles.recurringBox}>
              <Text style={styles.recurringIcon}>🔁</Text>
              <View>
                <Text style={styles.recurringTitle}>Recurring</Text>
                <Text style={styles.recurringDesc}>
                  Every {DAY_NAMES[squad.recurring.dayOfWeek ?? 0]} at{" "}
                  {squad.recurring.time}
                </Text>
              </View>
            </View>
          )}

          {/* Members */}
          <Text style={styles.sectionTitle}>Members</Text>
          {squad.memberDetails.map((m) => {
            const isSelf = m.uid === user?.uid;
            const canRemoveThis =
              canManage && !isSelf && m.uid !== squad.adminUid;
            const canPromoteThis = isAdmin && m.role === "member";

            return (
              <View key={m.uid} style={styles.memberRow}>
                {m.photoUrl ? (
                  <Image
                    source={{ uri: m.photoUrl }}
                    style={styles.memberAvatar}
                  />
                ) : (
                  <View style={[styles.memberAvatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {m.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.name} {isSelf ? "(you)" : ""}
                  </Text>
                  <Text style={styles.memberMeta}>
                    ⭐ {m.guestScore} ·{" "}
                    {m.role === "admin"
                      ? "Admin"
                      : m.role === "co_admin"
                      ? "Co-admin"
                      : "Member"}
                  </Text>
                </View>
                {canPromoteThis && (
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => handlePromote(m.uid)}
                  >
                    <Text style={styles.smallBtnText}>Promote</Text>
                  </TouchableOpacity>
                )}
                {canRemoveThis && (
                  <TouchableOpacity
                    style={[styles.smallBtn, styles.smallBtnDanger]}
                    onPress={() => setRemoveModal(m.uid)}
                  >
                    <Text style={styles.smallBtnDangerText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Actions */}
          <View style={styles.actionsSection}>
            
            {/* Task 54 & 55: Host Tools */}
            {isAdmin && isHostTier && (
              <View style={{ marginTop: 8, marginBottom: 16, padding: 16, backgroundColor: "#FFF8E1", borderRadius: 12, borderWidth: 1, borderColor: "#FFC107" }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#FF9800", marginBottom: 12 }}>👑 Host Tier Tools</Text>
                
                <TouchableOpacity style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#FFC10733" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#333" }}>🎨 Custom Squad Branding</Text>
                  <Text style={{ fontSize: 12, color: "#666" }}>Logo, colors, custom URL</Text>
                </TouchableOpacity>

                {/* Task 55: Revenue Dashboard Navigation */}
                <TouchableOpacity 
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#FFC10733" }}
                  onPress={() => router.push("/host/revenue" as any)}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#333" }}>📊 Revenue Dashboard</Text>
                  <Text style={{ fontSize: 12, color: "#666" }}>Track paid plan earnings</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ paddingVertical: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#333" }}>📁 Bulk CSV Import</Text>
                  <Text style={{ fontSize: 12, color: "#666" }}>Invite members in bulk</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Task 52: Leaderboard */}
            {myRole !== "visitor" && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#FFF8E1", borderColor: "#FFC107" }]}
                onPress={() => router.push(`/squad/leaderboard/${squad.id}` as any)}
              >
                <Text style={{ color: "#FF9800", fontWeight: "700", fontSize: 14 }}>🏆 View Leaderboard</Text>
              </TouchableOpacity>
            )}

            {/* Task 43: Squad Insights */}
            {isAdmin && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#E3F2FD", borderColor: "#2196F3" }]}
                onPress={() => router.push(`/squad/insights/${squad.id}` as any)}
              >
                <Text style={{ color: "#2196F3", fontWeight: "700", fontSize: 14 }}>📊 View Squad Insights</Text>
              </TouchableOpacity>
            )}

            {/* Task 33: Year in Review Button */}
            {myRole !== "visitor" && (
              <TouchableOpacity
                style={styles.recapBtn}
                onPress={() => router.push(`/squad/recap/${squad.id}` as any)}
              >
                <Text style={styles.recapEmoji}>✨</Text>
                <Text style={styles.recapText}>
                  View {new Date().getFullYear()} Year in Review
                </Text>
              </TouchableOpacity>
            )}

            {myRole !== "visitor" && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={handleInvite}
              >
                <Text style={styles.actionPrimaryText}>+ Invite Member</Text>
              </TouchableOpacity>
            )}

            {myRole !== "visitor" && (
              <TouchableOpacity style={styles.actionBtn} onPress={handleLeave}>
                <Text style={styles.actionText}>Leave Squad</Text>
              </TouchableOpacity>
            )}

            {myRole === "member" || myRole === "co_admin" ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnWarning]}
                onPress={handleFork}
              >
                <Text style={styles.actionWarningText}>
                  Fork Squad (if admin is inactive)
                </Text>
              </TouchableOpacity>
            ) : null}

            {isAdmin && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={handleArchive}
              >
                <Text style={styles.actionDangerText}>Archive Squad</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Remove member modal */}
      <Modal visible={!!removeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Remove member</Text>
            <Text style={styles.modalDesc}>
              Give a reason. It will be logged for the member's appeal.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Consistently disruptive"
              placeholderTextColor="#999"
              value={removeReason}
              onChangeText={setRemoveReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setRemoveModal(null);
                  setRemoveReason("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleRemoveConfirm}
              >
                <Text style={styles.modalConfirmText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  content: { paddingBottom: 40 },
  hero: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  backIcon: {
    position: "absolute",
    top: 12,
    left: 16,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  backIconText: { fontSize: 20, color: "#333" },
  heroImage: { width: "100%", height: "100%" },
  heroEmoji: { fontSize: 72 },
  heroTag: {
    position: "absolute",
    bottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroTagText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  safetyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  body: { padding: 24 },
  title: { fontSize: 26, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  desc: { fontSize: 15, color: "#666", lineHeight: 22, marginBottom: 16 },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  meta: { fontSize: 14, color: "#666" },
  recurringBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  recurringIcon: { fontSize: 24, marginRight: 12 },
  recurringTitle: { fontSize: 13, fontWeight: "700", color: "#1565C0" },
  recurringDesc: { fontSize: 13, color: "#666", marginTop: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarFallback: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 16, fontWeight: "700", color: "#999" },
  memberName: { fontSize: 14, fontWeight: "700", color: "#333" },
  memberMeta: { fontSize: 12, color: "#999", marginTop: 2 },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E91E63",
    marginLeft: 6,
  },
  smallBtnText: { fontSize: 11, color: "#E91E63", fontWeight: "700" },
  smallBtnDanger: { borderColor: "#FF3B30" },
  smallBtnDangerText: { fontSize: 11, color: "#FF3B30", fontWeight: "700" },
  
  actionsSection: { marginTop: 32, gap: 12 },
  
  insightsBtn: {
    backgroundColor: "#E3F2FD",
    borderWidth: 1.5,
    borderColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  insightsText: { fontSize: 15, fontWeight: "800", color: "#2196F3" },

  recapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    borderWidth: 1.5,
    borderColor: "#FF9800",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  recapEmoji: { fontSize: 20, marginRight: 8 },
  recapText: { fontSize: 15, fontWeight: "800", color: "#E65100" },

  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  actionText: { fontSize: 14, fontWeight: "700", color: "#333" },
  actionBtnPrimary: {
    backgroundColor: "#E91E63",
    borderColor: "#E91E63",
  },
  actionPrimaryText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  actionBtnWarning: { borderColor: "#FF9800" },
  actionWarningText: { fontSize: 14, fontWeight: "700", color: "#FF9800" },
  actionBtnDanger: { borderColor: "#FF3B30" },
  actionDangerText: { fontSize: 14, fontWeight: "700", color: "#FF3B30" },
  errorText: { fontSize: 16, color: "#666", marginTop: 12, marginBottom: 24 },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#E91E63",
    borderRadius: 12,
  },
  backText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  modalDesc: { fontSize: 13, color: "#666", marginTop: 6, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    minHeight: 80,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#FAFAFA",
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    justifyContent: "flex-end",
  },
  modalCancel: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: "#666" },
  modalConfirm: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
  },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});