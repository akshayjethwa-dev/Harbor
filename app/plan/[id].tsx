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
  Platform,
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
import { Plan, PlanJoinRequest, PlanParticipant } from "../../src/types/plan";
import { TimeBlockRanges, GarbaCrewUser } from "../../src/types/user";
import { getActivityMeta } from "../../src/constants/activities";
import { useAuth } from "../../src/context/AuthContext";
import RequestCard from "../../src/components/plan/RequestCard";
import AddToCalendarButton from "../../src/components/plan/AddToCalendarButton";
import ShareButton from "../../src/components/plan/ShareButton";
import QRCodeModal from "../../src/components/plan/QRCodeModal";
import CheckInButton from "../../src/components/plan/CheckInButton";
import SaveAsTemplateButton from "../../src/components/plan/SaveAsTemplateButton";
import { planShareUrl } from "../../src/services/shareService";
import { Ionicons } from "@expo/vector-icons";
import DatePollCard from "../../src/components/poll/DatePollCard";
import { getUserProfile } from "../../src/services/userService";
import PresenceBar from "../../src/components/plan/PresenceBar";
import { usePresence } from "../../src/hooks/usePresence";
import EditPlanSettingsModal from "../../src/components/plan/EditPlanSettingsModal";
import MarkAttendanceModal from "../../src/components/plan/MarkAttendanceModal";
import { disputeNoShow } from "../../src/services/attendanceService";
import ReportProfileModal from "../../src/components/profile/ReportProfileModal";
import ContextualTip from "../../src/components/onboarding/ContextualTip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import InvitePromptModal from "../../src/components/referral/InvitePromptModal";

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
  const [organizerRanges, setOrganizerRanges] = useState<TimeBlockRanges | undefined>();

  const { viewers } = usePresence(id);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<PlanParticipant | null>(null);
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === "web") {
      if (buttons && buttons.length > 1) {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) {
          const confirmBtn = buttons.find(
            (b) => b.style === "destructive" || b.text === "Leave" || b.text === "Decline" || b.text === "Send request" || b.text === "Dispute"
          );
          if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
        }
      } else {
        window.alert(`${title}\n\n${message}`);
        if (buttons && buttons.length > 0 && buttons[0].onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

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

  useEffect(() => {
    if (!plan?.hostUid) return;
    getUserProfile(plan.hostUid)
      .then((profile) => {
        if (profile?.timeBlockRanges) {
          setOrganizerRanges(profile.timeBlockRanges);
        }
      })
      .catch((err) => console.warn("Could not load organizer ranges:", err));
  }, [plan?.hostUid]);

  useEffect(() => {
    const checkInvitePrompt = async () => {
      if (!user || !plan) return;
      if (user.uid !== plan.hostUid) return;
      const isFirstPlan = (user.plansCreatedCount || 0) === 1;
      if (!isFirstPlan) return;

      const dismissedAtStr = await AsyncStorage.getItem("invite_prompt_dismissed_at");
      if (dismissedAtStr) {
        const dismissedAt = parseInt(dismissedAtStr, 10);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedAt < sevenDays) return;
      }
      setTimeout(() => setShowInvitePrompt(true), 1500);
    };
    checkInvitePrompt();
  }, [user, plan]);

  useFocusEffect(useCallback(() => {}, []));

  const handlePrimaryAction = async () => {
    if (!plan) return;
    if (!user) {
      showAlert(
        "Sign in required",
        "Please sign in to join or interact with this plan."
      );
      return;
    }

    const role = getPlanRole(plan, user.uid);

    if (role === "host") {
      router.push({
        pathname: "/plan/chat/[id]" as any,
        params: { id: plan.chatId.replace("plan_", "") },
      });
      return;
    }

    if (role === "participant") {
      showAlert(
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
                const code = e?.code ?? "unknown";
                console.error("[leavePlan] failed:", code, e?.message, e);
                showAlert(
                  "Could not leave",
                  `${e?.message ?? "Please try again."}\n\n(code: ${code})`
                );
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
      showAlert("Cancel request?", "You'll withdraw your join request.", [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            setActing(true);
            try {
              await leavePlan(plan.id);
            } catch (e: any) {
              const code = e?.code ?? "unknown";
              console.error("[leavePlan/pending] failed:", code, e?.message, e);
              showAlert(
                "Error",
                `${e?.message ?? "Please try again."}\n\n(code: ${code})`
              );
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
      showAlert("Can't join", check.reason ?? "You don't meet the requirements.");
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
    if (!user) {
      showAlert("Sign in required", "Please sign in to join this plan.");
      return;
    }

    console.log("[joinPlan] start", { planId: plan.id, message });
    setActing(true);
    try {
      const result = await joinPlan(plan.id, message);
      console.log("[joinPlan] result", result);
      setShowRequestModal(false);

      if (result?.status === "joined") {
        showAlert("You're in! 🎉", "Say hi to the crew in the chat.");
      } else if (result?.status === "requested") {
        showAlert("Request sent", "The host will review and respond within 48 hours.");
      } else if (result?.status === "waitlisted") {
        showAlert("Waitlisted", "We'll notify you if a spot opens up.");
      } else {
        showAlert("Done", `Join result: ${result?.status ?? "unknown"}.`);
      }

      if (result?.warning) console.warn("Join warning:", result.warning);
    } catch (e: any) {
      const code = e?.code ?? "unknown";
      const msg = e?.message ?? String(e) ?? "Try again";
      console.error("[joinPlan] failed:", code, msg, e);
      showAlert("Could not join", `${msg}\n\n(code: ${code})`);
    } finally {
      setActing(false);
    }
  };

  const handleApprove = async (requestUid: string) => {
    if (!plan) return;
    try {
      await approveJoinRequest(plan.id, requestUid);
    } catch (e: any) {
      const code = e?.code ?? "unknown";
      console.error("[approveJoinRequest] failed:", code, e?.message, e);
      showAlert(
        "Could not approve",
        `${e?.message ?? "Try again."}\n\n(code: ${code})`
      );
    }
  };

  const handleDecline = async (requestUid: string) => {
    if (!plan) return;
    showAlert("Decline request?", "This person will not be added.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          try {
            await declineJoinRequest(plan.id, requestUid);
          } catch (e: any) {
            const code = e?.code ?? "unknown";
            console.error("[declineJoinRequest] failed:", code, e?.message, e);
            showAlert(
              "Could not decline",
              `${e?.message ?? "Try again."}\n\n(code: ${code})`
            );
          }
        },
      },
    ]);
  };

  const handleDisputeNoShow = () => {
    if (!plan || !user) return;
    showAlert(
      "Dispute No-Show",
      "Are you sure you want to dispute this? The organizer will be notified to review your attendance.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Dispute",
          style: "destructive",
          onPress: async () => {
            try {
              await disputeNoShow(plan.id, user.uid);
              showAlert("Dispute Sent", "The organizer will review your attendance.");
            } catch (e: any) {
              showAlert("Error", e.message);
            }
          },
        },
      ]
    );
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

  const isMemberOfPlan = role === "host" || role === "participant";
  const canVoteInPoll = isMemberOfPlan;
  const showPoll = !!plan.pendingDatePollId;
  const canCreatePoll = role === "host" && !plan.pendingDatePollId;
  const hasDateInProgress = !!plan.pendingDatePollId && plan.dateStatus !== "confirmed";

  const hasPlanEnded = plan?.endTime
    ? (plan.endTime.toMillis ? plan.endTime.toMillis() : new Date(plan.endTime).getTime()) < Date.now()
    : false;

  const isHost = role === "host";
  const showAttendanceBtn = isHost && hasPlanEnded && !plan.attendanceMarked;
  const isMarkedNoShow = plan.noShowUids?.includes(user?.uid || "");
  const showDisputeBtn = isMarkedNoShow && hasPlanEnded;
  const showInsightsBtn = isHost && hasPlanEnded && plan.status !== "cancelled";

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

          {role === "host" && (
            <TouchableOpacity
              style={styles.editSettingsBtn}
              onPress={() => setShowSettingsModal(true)}
            >
              <Text style={styles.editSettingsText}>⚙️ Edit Plan Settings</Text>
            </TouchableOpacity>
          )}

          <PresenceBar viewers={viewers} />

          <ContextualTip
            id="date_poll_tip"
            text="Tip: Tap here to vote on proposed dates so the organizer knows when you're free!"
          />

          {showPoll && (
            <DatePollCard
              pollId={plan.pendingDatePollId!}
              organizerId={plan.hostUid}
              canVote={canVoteInPoll}
              participantUids={plan.participants ?? []}
              organizerRanges={organizerRanges}
            />
          )}

          {canCreatePoll && (
            <TouchableOpacity
              style={styles.pollCreateBtn}
              onPress={() =>
                router.push(
                  `/poll/create?planId=${plan.id}&planHasDate=${!!plan.startTime}` as any
                )
              }
              activeOpacity={0.85}
            >
              <Text style={styles.pollCreateIcon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pollCreateTitle}>Create a date poll</Text>
                <Text style={styles.pollCreateSub}>
                  Propose 3–5 times and let members vote
                </Text>
              </View>
              <Text style={styles.pollCreateChevron}>›</Text>
            </TouchableOpacity>
          )}

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🕒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>When</Text>
                <Text style={styles.infoValue}>
                  {formatFullDate(plan.startTime)}
                </Text>
                {hasDateInProgress ? (
                  <Text style={styles.infoPending}>
                    ⏳ Members are voting on alternate dates above
                  </Text>
                ) : (
                  <Text style={styles.infoSub}>{plan.durationMinutes} min</Text>
                )}
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

          {/* UPDATED: Generic Requirements Section */}
          {(plan.requirements.verifiedOnly ||
            plan.requirements.womenOnly ||
            plan.requirements.minGuestScore != null ||
            (plan.requirements as any).preferredVibe ||
            (plan.requirements as any).requiredInterest) && (
            <View style={styles.reqBox}>
              <Text style={styles.reqTitle}>Plan Requirements</Text>
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
                {(plan.requirements as any).preferredVibe && (
                  <View style={[styles.reqBadge, { backgroundColor: "#FFF5F8" }]}>
                    <Text style={[styles.reqText, { color: "#E91E63" }]}>
                      ✨ {(plan.requirements as any).preferredVibe} Vibe
                    </Text>
                  </View>
                )}
                {(plan.requirements as any).requiredInterest && (
                  <View style={[styles.reqBadge, { backgroundColor: "#E8F5E9" }]}>
                    <Text style={[styles.reqText, { color: "#2E7D32" }]}>
                      🎯 {(plan.requirements as any).requiredInterest} Fans
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {showParticipantExtras && <CheckInButton plan={plan} />}

          {showAttendanceBtn && (
            <TouchableOpacity
              style={[styles.actionCardBtn, { backgroundColor: "#E3F2FD", borderColor: "#2196F3", marginTop: 8, marginBottom: 16 }]}
              onPress={() => setShowAttendanceModal(true)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 20 }}>📋</Text>
                <Text style={[styles.actionCardText, { color: "#2196F3" }]}>Mark Attendance</Text>
              </View>
              <Text style={[styles.actionCardChevron, { color: "#2196F3" }]}>›</Text>
            </TouchableOpacity>
          )}

          {showDisputeBtn && (
            <TouchableOpacity
              style={[styles.actionCardBtn, { backgroundColor: "#FFF5F5", borderColor: "#FF3B30", marginTop: 8, marginBottom: 16 }]}
              onPress={handleDisputeNoShow}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 20 }}>⚠️</Text>
                <Text style={[styles.actionCardText, { color: "#FF3B30" }]}>Dispute No-Show</Text>
              </View>
              <Text style={[styles.actionCardChevron, { color: "#FF3B30" }]}>›</Text>
            </TouchableOpacity>
          )}

          {showParticipantExtras && (
            <View style={{ marginBottom: 12 }}>
              {showInsightsBtn && (
                <TouchableOpacity
                  style={[styles.actionCardBtn, { backgroundColor: "#E3F2FD", borderColor: "#2196F3", marginBottom: 10 }]}
                  onPress={() => router.push(`/plan/insights/${plan.id}` as any)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 20 }}>📊</Text>
                    <Text style={[styles.actionCardText, { color: "#2196F3" }]}>View Plan Insights</Text>
                  </View>
                  <Text style={[styles.actionCardChevron, { color: "#2196F3" }]}>›</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionCardBtn}
                onPress={() => router.push(`/plan/activity/${plan.id}` as any)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>📢</Text>
                  <Text style={styles.actionCardText}>Activity Feed</Text>
                </View>
                <Text style={styles.actionCardChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCardBtn}
                onPress={() => router.push(`/plan/tasks/${plan.id}` as any)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>✅</Text>
                  <Text style={styles.actionCardText}>Tasks & To-dos</Text>
                </View>
                <Text style={styles.actionCardChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCardBtn}
                onPress={() => router.push(`/plan/expenses/${plan.id}` as any)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🧾</Text>
                  <Text style={styles.actionCardText}>Expenses & Budget</Text>
                </View>
                <Text style={styles.actionCardChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCardBtn}
                onPress={() => router.push(`/plan/album/${plan.id}` as any)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>📸</Text>
                  <Text style={styles.actionCardText}>Photo Album</Text>
                </View>
                <Text style={styles.actionCardChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCardBtn}
                onPress={() => router.push(`/plan/ideas/${plan.id}` as any)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>💡</Text>
                  <Text style={styles.actionCardText}>Ideas & Suggestions</Text>
                </View>
                <Text style={styles.actionCardChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCardBtn}
                onPress={() => router.push(`/plan/itinerary/${plan.id}` as any)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🗓️</Text>
                  <Text style={styles.actionCardText}>Itinerary</Text>
                </View>
                <Text style={styles.actionCardChevron}>›</Text>
              </TouchableOpacity>

              {hasPlanEnded && (
                <TouchableOpacity
                  style={[styles.actionCardBtn, { backgroundColor: "#FFF5F8", borderColor: "#E91E63" }]}
                  onPress={() => router.push(`/plan/recap/${plan.id}` as any)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 20 }}>✨</Text>
                    <Text style={[styles.actionCardText, { color: "#E91E63" }]}>View Plan Recap</Text>
                  </View>
                  <Text style={[styles.actionCardChevron, { color: "#E91E63" }]}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

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

          {showParticipantExtras && (
            <TouchableOpacity
              style={styles.qrBtn}
              onPress={() => setShowQR(true)}
            >
              <Text style={styles.qrBtnIcon}>📱</Text>
              <Text style={styles.qrBtnText}>Show QR code to invite</Text>
            </TouchableOpacity>
          )}

          {role === "host" && <SaveAsTemplateButton plan={plan} />}

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

          <Text style={styles.sectionTitle}>
            Who's coming ({plan.participantDetails.length})
          </Text>
          {plan.participantDetails.length === 0 ? (
            <Text style={styles.emptyText}>No one yet — be the first!</Text>
          ) : (
            <View style={styles.avatarRow}>
              {plan.participantDetails.slice(0, 6).map((p) => (
                <TouchableOpacity
                  key={p.uid}
                  style={styles.participantWrap}
                  onPress={() => {
                    if (p.uid !== user?.uid) {
                      setReportTarget(p);
                    }
                  }}
                >
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
                  {p.uid !== user?.uid && (
                    <View style={styles.reportFlag}>
                      <Ionicons name="flag" size={8} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
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

      {showRequestModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request to Join</Text>
            <Text style={styles.modalDesc}>
              Add an optional message to the host. They'll review within 48 hours.
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
      )}

      <QRCodeModal
        visible={showQR}
        url={planShareUrl(plan.id)}
        label={plan.title}
        onClose={() => setShowQR(false)}
      />

      <EditPlanSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        plan={plan}
      />

      <MarkAttendanceModal
        visible={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        plan={plan}
      />

      {reportTarget && (
        <ReportProfileModal
          visible={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetUser={{
            uid: reportTarget.uid,
            name: reportTarget.name,
            photoUrl: reportTarget.photoUrl,
          } as GarbaCrewUser}
        />
      )}

      <InvitePromptModal
        visible={showInvitePrompt}
        onClose={() => setShowInvitePrompt(false)}
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

  editSettingsBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  editSettingsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },

  pollCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E91E63",
    backgroundColor: "#FFF5F8",
    marginBottom: 16,
    gap: 12,
  },
  pollCreateIcon: { fontSize: 26 },
  pollCreateTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#E91E63",
  },
  pollCreateSub: { fontSize: 12, color: "#999", marginTop: 2 },
  pollCreateChevron: { fontSize: 22, color: "#E91E63", fontWeight: "700" },

  actionCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  actionCardText: { fontSize: 15, fontWeight: "700", color: "#333" },
  actionCardChevron: { fontSize: 18, color: "#999" },

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
  infoPending: {
    fontSize: 12,
    color: "#E91E63",
    marginTop: 2,
    fontWeight: "600",
  },
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
  participantWrap: {
    position: "relative",
  },
  participant: { width: 44, height: 44, borderRadius: 22 },
  reportFlag: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#F44336",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
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