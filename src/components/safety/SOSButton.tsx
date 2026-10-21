// src/components/safety/SOSButton.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  triggerSOS,
  cancelSOS,
  getEmergencyContacts,
  getSOSLocation, // <-- Task 39: Import location helper
} from "../../services/safetyService";
import { SOS_CANCEL_WINDOW_MS, SOS_ESCALATION_MS } from "../../types/safety";
// ─── Task 39: Emergency Contacts Manager ───
import ManageEmergencyContactsModal from "./ManageEmergencyContactsModal";

interface Props {
  chatId?: string;
  planId?: string;
  squadId?: string;
}

type Phase = "idle" | "confirm" | "active";

export default function SOSButton({ chatId, planId, squadId }: Props) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(10);
  const [sosId, setSosId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [noContacts, setNoContacts] = useState(false);
  const [escalate, setEscalate] = useState(false);
  
  // Task 39: Modal State
  const [showContactsModal, setShowContactsModal] = useState(false);

  const cancelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const escalateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel window countdown
  useEffect(() => {
    if (phase !== "confirm") return;
    if (countdown <= 0) {
      confirmSOS();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Escalation timer once SOS is active
  useEffect(() => {
    if (phase !== "active") return;
    escalateTimer.current = setTimeout(() => {
      setEscalate(true);
    }, SOS_ESCALATION_MS);
    return () => {
      if (escalateTimer.current) clearTimeout(escalateTimer.current);
    };
  }, [phase]);

  const openConfirm = async () => {
    if (!user) return;
    // Check emergency contacts presence
    const contacts = await getEmergencyContacts(user.uid);
    setNoContacts(contacts.length === 0);
    setCountdown(10);
    setPhase("confirm");
  };

  const confirmSOS = async () => {
    if (!user) return;
    setSending(true);

    // Task 39: Get GPS with fallback
    const { lat, lng, acc, isLastKnown } = await getSOSLocation();

    try {
      const id = await triggerSOS({
        me: user,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        isLastKnownLocation: isLastKnown,
        chatId,
        planId,
        squadId,
      });
      setSosId(id);
      setPhase("active");
    } catch (e: any) {
      Alert.alert("Could not send SOS", e.message ?? "Try again");
      setPhase("idle");
    } finally {
      setSending(false);
    }
  };

  const abortConfirm = () => {
    if (cancelTimer.current) clearTimeout(cancelTimer.current);
    setPhase("idle");
  };

  const cancelActiveSOS = async () => {
    if (!sosId) return;
    Alert.alert(
      "Cancel SOS?",
      "Your crew will be notified that you're safe. This cannot be undone.",
      [
        { text: "Keep active", style: "cancel" },
        {
          text: "I'm safe",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSOS(sosId);
            } catch (e) {
              // silent
            }
            setSosId(null);
            setPhase("idle");
            setEscalate(false);
          },
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, phase === "active" && styles.btnActive]}
        onPress={phase === "idle" ? openConfirm : cancelActiveSOS}
      >
        <Text style={styles.btnText}>
          {phase === "active" ? "SOS ACTIVE" : "SOS"}
        </Text>
      </TouchableOpacity>

      {/* Confirmation modal */}
      <Modal visible={phase === "confirm"} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.emoji}>🚨</Text>
            <Text style={styles.title}>Send SOS?</Text>
            <Text style={styles.subtitle}>
              Your location will be shared with everyone in this Plan and your
              emergency contacts.
            </Text>

            {noContacts && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ You haven't set emergency contacts.
                </Text>
                {/* Task 39: Button to open ManageContacts */}
                <TouchableOpacity 
                  style={{ marginTop: 8, backgroundColor: "#FFF", padding: 8, borderRadius: 6, alignItems: "center" }}
                  onPress={() => setShowContactsModal(true)}
                >
                  <Text style={{ color: "#7A5C00", fontWeight: "700" }}>+ Add Contacts Now</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.countdownText}>
              Sending in <Text style={styles.countdownNum}>{countdown}s</Text>
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.action, styles.cancelBtn]}
                onPress={abortConfirm}
                disabled={sending}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.action, styles.confirmBtn]}
                onPress={confirmSOS}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmText}>Send now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Active SOS banner */}
      <Modal visible={phase === "active"} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.card, styles.activeCard]}>
            <Text style={styles.emoji}>🆘</Text>
            <Text style={[styles.title, { color: "#FF3B30" }]}>
              SOS is active
            </Text>
            <Text style={styles.subtitle}>
              Your crew has been notified. Live location is being shared for 30
              minutes.
            </Text>

            {escalate && (
              <View style={styles.emergencyBox}>
                <Text style={styles.emergencyText}>
                  No response yet? Call emergency services
                </Text>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() =>
                    Alert.alert(
                      "Dial 112?",
                      "This will open your phone dialer.",
                      [{ text: "OK" }]
                    )
                  }
                >
                  <Text style={styles.callText}>📞 Call 112</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.action, styles.safeBtn]}
              onPress={cancelActiveSOS}
            >
              <Text style={styles.safeText}>I'm safe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Task 39: Manage Contacts Modal */}
      <ManageEmergencyContactsModal 
        visible={showContactsModal} 
        onClose={() => {
          setShowContactsModal(false);
          // Re-check if they added any
          if (user) {
            getEmergencyContacts(user.uid).then(c => setNoContacts(c.length === 0));
          }
        }} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    marginRight: 12,
  },
  btnActive: { backgroundColor: "#C62828" },
  btnText: { color: "#FFF", fontWeight: "800", fontSize: 12, letterSpacing: 0.5 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  activeCard: { borderWidth: 2, borderColor: "#FF3B30" },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  warningBox: {
    backgroundColor: "#FFF8E1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  warningText: { fontSize: 12, color: "#7A5C00", lineHeight: 18 },
  countdownText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  countdownNum: {
    color: "#FF3B30",
    fontWeight: "800",
    fontSize: 18,
  },
  actions: { flexDirection: "row", gap: 12, width: "100%" },
  action: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: { backgroundColor: "#F0F0F0" },
  cancelText: { color: "#333", fontWeight: "700", fontSize: 15 },
  confirmBtn: { backgroundColor: "#FF3B30" },
  confirmText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  safeBtn: {
    backgroundColor: "#E8F5E9",
    marginTop: 20,
    width: "100%",
  },
  safeText: { color: "#2E7D32", fontWeight: "700", fontSize: 15 },
  emergencyBox: {
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 13,
    color: "#C62828",
    textAlign: "center",
    marginBottom: 12,
  },
  callBtn: {
    backgroundColor: "#C62828",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  callText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});