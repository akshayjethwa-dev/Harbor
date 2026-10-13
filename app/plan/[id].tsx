import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import {
  getPlanRole,
  checkRequirements,
} from "../../src/services/planService";
import {
  joinPlan,
  leavePlan,
  approveJoinRequest,
  declineJoinRequest,
} from "../../src/services/planJoinService";
import { Plan, PlanJoinRequest } from "../../src/types/plan";
import { getActivityMeta } from "../../src/constants/activities";
import { useAuth } from "../../src/context/AuthContext";
import RequestCard from "../../src/components/plan/RequestCard";
import AddToCalendarButton from "../../src/components/plan/AddToCalendarButton";
import ShareButton from "../../src/components/plan/ShareButton";
import QRCodeModal from "../../src/components/plan/QRCodeModal";
import CheckInButton from "../../src/components/plan/CheckInButton";
import SaveAsTemplateButton from "../../src/components/plan/SaveAsTemplateButton";
import { planShareUrl } from "../../src/services/shareService";

function formatFullDate(ts: any): string {
  if (!ts) return "TBD";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [showQR, setShowQR] = useState(false);

  // Live subscription to plan
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, "plans", id),
      (snap) => {
        if (!snap.exists()) {
          setError("Plan not found");
        } else {
          setPlan({ id: snap.id, ...snap.data() } as Plan);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  useFocusEffect(useCallback(() => {}, []));

  const handlePrimaryAction = async () => {
    if (!plan || !user) return;
    const role = getPlanRole(plan, user.uid);

    if (role === "host") {
      router.push({
        pathname: "/plan/chat/[id]" as any,
        params: { id: plan.chatId.replace("plan_", "") },
      });
      return;
    }

    if (role === "participant") {
      Alert.alert(
        "Leave Plan?",
        "You'll be removed from the Plan and its chat. Your Trust Balance escrow will be returned.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: async () => {
              setActing(true);
              try {
                await leavePlan(plan.id);
              } catch (e: any) {
                Alert.alert("Could not leave", e.message);
              } finally {
                setActing(false);
              }
            },
          },
        ]
      );
      return;
    }

    if (role === "pending") {
      Alert.alert("Cancel request?", "You'll withdraw your join request.", [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            setActing(true);
            try {
              await leavePlan(plan.id);
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally {
              setActing(false);
            }
          },
        },
      ]);
      return;
    }

    const check = checkRequirements(plan, user);
    if (!check.ok) {
      Alert.alert(
        "Can't join",
        check.reason ?? "You don't meet the requirements."
      );
      return;
    }

    if (plan.approvalMode === "manual" || plan.approvalMode === "paid_manual") {
      setRequestMessage("");
      setShowRequestModal(true);
      return;
    }

    await performJoin("");
  };

  const performJoin = async (message: string) => {
    if (!plan) return;
    setActing(true);
    try {
      const result = await joinPlan(plan.id, message);
      setShowRequestModal(false);
      if (result.status === "joined") {
        Alert.alert("You're in! 🎉", "Say hi to the crew in the chat.");
      } else if (result.status === "requested") {
        Alert.alert(
          "Request sent",
          "The host will review and respond within 48 hours."
        );
      } else if (result.status === "waitlisted") {
        Alert.alert("Waitlisted", "We'll notify you if a spot opens up.");
      }
      if (result.warning) console.warn("Join warning:", result.warning);
    } catch (e: any) {
      Alert.alert("Could not join", e.message ?? "Try again");
    } finally {
      setActing(false);
    }
  };

  const handleApprove = async (requestUid: string) => {
    if (!plan) return;
    try {
      await approveJoinRequest(plan.id, requestUid);
    } catch (e: any) {
      Alert.alert("Could not approve", e.message);
    }
  };

  const handleDecline = async (requestUid: string) => {
    if (!plan) return;
    Alert.alert("Decline request?", "This person will not be added.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          try {
            await declineJoinRequest(plan.id, requestUid);
          } catch (e: any) {
            Alert.alert("Could not decline", e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={{ fontSize: 48 }}>😕</Text>
        <Text style={styles.errorText}>{error ?? "Plan not found"}</Text>
        <TouchableOpacity style={styles.backBtnAlt} onPress={() => router.back()}>
          <Text style={styles.backTextAlt}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const act = getActivityMeta(plan.activity);
  const role = user ? getPlanRole(plan, user.uid) : "visitor";

  const priceLabel =
    plan.costTotal > 0 ? `₹${plan.costPerPerson} / person` : "Free";
  const capacityLabel =
    plan.capacity === 0
      ? "Unlimited"
      : `${plan.spotsFilled} / ${plan.capacity}`;
  const isFull = plan.capacity > 0 && plan.spotsFilled >= plan.capacity;

  let cta = "I'm In";
  const ctaDisabled = false;
  if (role === "host") cta = "Open Chat";
  else if (role === "participant") cta = "Leave Plan";
  else if (role === "pending") cta = "Request pending…";
  else if (role === "waitlist") cta = "On waitlist";
  else if (isFull) cta = "Join Waitlist";
  else if (plan.approvalMode === "manual" || plan.approvalMode === "paid_manual")
    cta = "Request to Join";
  else if (plan.costTotal > 0) cta = `Join & Pay ₹${plan.costPerPerson}`;

  const showInviteBtn = role === "host" || role === "participant";
  const showParticipantExtras = role === "host" || role === "participant";
  const pendingRequests = (plan.pendingRequests ?? []) as PlanJoinRequest[];
  const showApprovals = role === "host" && pendingRequests.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: act.color + "22" }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroEmoji}>{act.emoji}</Text>
          <View style={[styles.heroTag, { backgroundColor: act.color }]}>
            <Text style={styles.heroTagText}>{act.label}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{plan.title}</Text>
          {plan.description ? (
            <Text style={styles.desc}>{plan.description}</Text>
          ) : null}

          {/* Host */}
          <View style={styles.hostCard}>
            {plan.hostPhotoUrl ? (
              <Image source={{ uri: plan.hostPhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {plan.hostName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.hostName}>{plan.hostName}</Text>
              <Text style={styles.hostMeta}>
                ⭐ Host Score {plan.hostScore}
                {plan.hostVerified ? " · ✅ Verified" : ""}
              </Text>
            </View>
          </View>

          {/* Info rows */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🕒</Text>
              <View>
                <Text style={styles.infoLabel}>When</Text>
                <Text style={styles.infoValue}>
                  {formatFullDate(plan.startTime)}
                </Text>
                <Text style={styles.infoSub}>{plan.durationMinutes} min</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Where</Text>
                <Text style={styles.infoValue}>{plan.locationName}</Text>
                <Text style={styles.infoSub}>
                  {plan.locationAddress ? plan.locationAddress + ", " : ""}
                  {plan.city}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👥</Text>
              <View>
                <Text style={styles.infoLabel}>Capacity</Text>
                <Text style={styles.infoValue}>{capacityLabel}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💰</Text>
              <View>
                <Text style={styles.infoLabel}>Cost</Text>
                <Text style={styles.infoValue}>{priceLabel}</Text>
              </View>
            </View>
          </View>

          {/* Requirements */}
          {(plan.requirements.verifiedOnly ||
            plan.requirements.womenOnly ||
            plan.requirements.minGuestScore != null ||
            plan.requirements.skillLevel) && (
            <View style={styles.reqBox}>
              <Text style={styles.reqTitle}>Requirements</Text>
              <View style={styles.reqRow}>
                {plan.requirements.verifiedOnly && (
                  <View style={styles.reqBadge}>
                    <Text style={styles.reqText}>✓ Verified</Text>
                  </View>
                )}
                {plan.requirements.womenOnly && (
                  <View style={styles.reqBadge}>
                    <Text style={styles.reqText}>♀ Women</Text>
                  </View>
                )}
                {plan.requirements.minGuestScore != null && (
                  <View style={styles.reqBadge}>
                    <Text style={styles.reqText}>
                      Guest ≥ {plan.requirements.minGuestScore}
                    </Text>
                  </View>
                )}
                {plan.requirements.skillLevel && (
                  <View style={styles.reqBadge}>
                    <Text style={styles.reqText}>
                      {plan.requirements.skillLevel}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Check-in (participants only) */}
          {showParticipantExtras && <CheckInButton plan={plan} />}

          {/* Add to calendar + Share */}
          {showParticipantExtras && (
            <View style={styles.extrasRow}>
              <View style={{ flex: 1 }}>
                <AddToCalendarButton plan={plan} />
              </View>
              <View style={{ flex: 1 }}>
                <ShareButton plan={plan} />
              </View>
            </View>
          )}

          {/* QR code */}
          {showParticipantExtras && (
            <TouchableOpacity
              style={styles.qrBtn}
              onPress={() => setShowQR(true)}
            >
              <Text style={styles.qrBtnIcon}>📱</Text>
              <Text style={styles.qrBtnText}>Show QR code to invite</Text>
            </TouchableOpacity>
          )}

          {/* Save as template (host only) */}
          {role === "host" && <SaveAsTemplateButton plan={plan} />}

          {/* Pending requests (host view) */}
          {showApprovals && (
            <View style={styles.requestsSection}>
              <Text style={styles.sectionTitle}>
                Join requests ({pendingRequests.length})
              </Text>
              {pendingRequests.map((r) => (
                <RequestCard
                  key={r.uid}
                  request={r}
                  onApprove={() => handleApprove(r.uid)}
                  onDecline={() => handleDecline(r.uid)}
                />
              ))}
            </View>
          )}

          {/* Participants */}
          <Text style={styles.sectionTitle}>
            Who's coming ({plan.participantDetails.length})
          </Text>
          {plan.participantDetails.length === 0 ? (
            <Text style={styles.emptyText}>No one yet — be the first!</Text>
          ) : (
            <View style={styles.avatarRow}>
              {plan.participantDetails.slice(0, 6).map((p) => (
                <View key={p.uid} style={styles.participantWrap}>
                  {p.photoUrl ? (
                    <Image
                      source={{ uri: p.photoUrl }}
                      style={styles.participant}
                    />
                  ) : (
                    <View style={[styles.participant, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>
                        {p.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {plan.participantDetails.length > 6 && (
                <View style={[styles.participant, styles.moreBadge]}>
                  <Text style={styles.moreText}>
                    +{plan.participantDetails.length - 6}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaBar}>
        {showInviteBtn && (
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => {
              router.push({
                pathname: "/invite/create" as any,
                params: {
                  type: "plan",
                  targetId: plan.id,
                  targetTitle: plan.title,
                  targetActivity: plan.activity,
                  existingMembers: plan.participants.join(","),
                },
              });
            }}
          >
            <Text style={styles.inviteText}>Invite</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.ctaBtn, { flex: 1 }, ctaDisabled && { opacity: 0.5 }]}
          onPress={handlePrimaryAction}
          disabled={ctaDisabled || acting}
        >
          {acting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.ctaText}>{cta}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Request modal */}
      <Modal visible={showRequestModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request to Join</Text>
            <Text style={styles.modalDesc}>
              Add an optional message to the host. They'll review within 48
              hours.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., I'm a cricket regular, looking forward to it!"
              placeholderTextColor="#999"
              value={requestMessage}
              onChangeText={setRequestMessage}
              multiline
              maxLength={300}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowRequestModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => performJoin(requestMessage)}
                disabled={acting}
              >
                {acting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Send request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR modal */}
      <QRCodeModal
        visible={showQR}
        url={planShareUrl(plan.id)}
        label={plan.title}
        onClose={() => setShowQR(false)}
      />
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
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  backBtn: {
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
  },
  backIcon: { fontSize: 20, color: "#333" },
  heroEmoji: { fontSize: 72 },
  heroTag: {
    position: "absolute",
    bottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroTagText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  body: { padding: 24 },
  title: { fontSize: 26, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  desc: { fontSize: 15, color: "#666", lineHeight: 22, marginBottom: 20 },
  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    marginBottom: 16,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarFallback: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 18, fontWeight: "700", color: "#999" },
  hostName: { fontSize: 15, fontWeight: "700", color: "#333" },
  hostMeta: { fontSize: 12, color: "#999", marginTop: 2 },
  infoBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoIcon: { fontSize: 22, marginRight: 14, width: 28, textAlign: "center" },
  infoLabel: { fontSize: 12, color: "#999", fontWeight: "600" },
  infoValue: { fontSize: 15, color: "#333", fontWeight: "600", marginTop: 2 },
  infoSub: { fontSize: 12, color: "#999", marginTop: 2 },
  reqBox: { marginBottom: 16 },
  reqTitle: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 8 },
  reqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reqBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#E3F2FD",
    borderRadius: 14,
  },
  reqText: { fontSize: 12, color: "#1565C0", fontWeight: "600" },
  extrasRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  qrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFF",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  qrBtnIcon: { fontSize: 16 },
  qrBtnText: { fontSize: 14, fontWeight: "700", color: "#333" },
  requestsSection: { marginTop: 16, marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    marginTop: 12,
    marginBottom: 12,
  },
  emptyText: { fontSize: 14, color: "#999", marginBottom: 24 },
  avatarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  participantWrap: {},
  participant: { width: 44, height: 44, borderRadius: 22 },
  moreBadge: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  moreText: { fontSize: 14, fontWeight: "700", color: "#666" },
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    flexDirection: "row",
    alignItems: "center",
  },
  inviteBtn: {
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#FFF",
  },
  inviteText: { color: "#E91E63", fontSize: 15, fontWeight: "700" },
  ctaBtn: {
    height: 56,
    backgroundColor: "#E91E63",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  errorText: { fontSize: 16, color: "#666", marginTop: 12, marginBottom: 24 },
  backBtnAlt: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#E91E63",
    borderRadius: 12,
  },
  backTextAlt: { color: "#FFF", fontWeight: "700", fontSize: 16 },
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
    minHeight: 90,
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
    backgroundColor: "#E91E63",
  },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});