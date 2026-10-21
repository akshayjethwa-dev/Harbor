// src/components/wallet/SubscriptionManager.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Subscription } from "../../types/subscription";
import { cancelSubscription, resumeSubscription, isInGracePeriod } from "../../services/monetizationService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  sub: Subscription | null;
  uid: string;
  onUpgradePress: () => void;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: c.bgElevated, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: c.border },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  tierText: { fontSize: 24, fontWeight: "900", color: c.primary, textTransform: "capitalize" },
  hostTierText: { color: "#DAA520" }, // Gold for Host
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: c.success + "22" },
  statusText: { fontSize: 11, fontWeight: "800", color: c.success, textTransform: "uppercase" },
  desc: { fontSize: 14, color: c.textSecondary, lineHeight: 20, marginBottom: 20 },
  
  warningBox: { backgroundColor: c.danger + "11", padding: 12, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: c.danger },
  warningText: { color: c.danger, fontSize: 13, fontWeight: "600", lineHeight: 18 },

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  label: { fontSize: 14, color: c.textSecondary },
  value: { fontSize: 14, fontWeight: "600", color: c.text },

  actionBtn: { padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  cancelBtn: { backgroundColor: c.bgSubtle, borderWidth: 1, borderColor: c.border },
  cancelText: { color: c.textSecondary, fontWeight: "700" },
  upgradeBtn: { backgroundColor: c.primary },
  upgradeText: { color: c.textInverse, fontWeight: "700" },
  hostBtn: { backgroundColor: "#DAA520" }, // Gold button
  hostText: { color: "#FFF", fontWeight: "700" },
});

export default function SubscriptionManager({ sub, uid, onUpgradePress }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(false);

  if (!sub || sub.tier === "free") {
    return (
      <View style={styles.card}>
        <Text style={styles.tierText}>Free Plan</Text>
        <Text style={styles.desc}>Upgrade to unlock premium features, priority booking, and more.</Text>
        <TouchableOpacity style={[styles.actionBtn, styles.upgradeBtn]} onPress={onUpgradePress}>
          <Text style={styles.upgradeText}>View Upgrade Options</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPastDue = sub.status === "past_due";
  const inGrace = isInGracePeriod(sub);
  const willCancel = sub.cancelAtPeriodEnd;
  const isHost = sub.tier === "host";

  const handleCancel = async () => {
    Alert.alert(
      "Cancel Subscription?",
      "Your plan will not auto-renew. You will retain access until the end of your current billing cycle.",
      [
        { text: "Keep Plan", style: "cancel" },
        { text: "Cancel", style: "destructive", onPress: async () => {
            setLoading(true);
            try {
              await cancelSubscription(uid);
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await resumeSubscription(uid);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const periodEndStr = sub.currentPeriodEnd?.toDate?.()
    ? sub.currentPeriodEnd.toDate().toLocaleDateString()
    : "N/A";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.tierText, isHost && styles.hostTierText]}>
          {isHost ? "👑 Host" : sub.tier} Plan
        </Text>
        <View style={[styles.statusPill, (isPastDue || willCancel) && { backgroundColor: "#FF980022" }]}>
          <Text style={[styles.statusText, (isPastDue || willCancel) && { color: "#FF9800" }]}>
            {isPastDue ? "Past Due" : willCancel ? "Canceling" : "Active"}
          </Text>
        </View>
      </View>

      {isPastDue && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Your recent payment failed. 
            {inGrace ? " You are in a 3-day grace period. Please update your payment method." : " Your grace period has ended. Features restricted."}
          </Text>
        </View>
      )}

      {willCancel && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Your subscription will end on {periodEndStr}. You will not be charged again.
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>Renews On</Text>
        <Text style={styles.value}>{willCancel ? "Ends " : "Renews "} {periodEndStr}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Trial</Text>
        <Text style={styles.value}>{sub.status === "trialing" ? "Active" : "No"}</Text>
      </View>

      {willCancel ? (
        <TouchableOpacity style={[styles.actionBtn, styles.upgradeBtn]} onPress={handleResume} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.upgradeText}>Resume Subscription</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancel} disabled={loading}>
          {loading ? <ActivityIndicator /> : <Text style={styles.cancelText}>Cancel Subscription</Text>}
        </TouchableOpacity>
      )}

      {!isHost && (
        <TouchableOpacity 
          style={[styles.actionBtn, styles.hostBtn, { marginTop: 12 }]} 
          onPress={onUpgradePress} 
          disabled={loading}
        >
          <Text style={styles.hostText}>👑 Upgrade to Host Tier (₹499/mo)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.actionBtn, { marginTop: 8 }]} onPress={onUpgradePress} disabled={loading}>
        <Text style={{ color: styles.tierText.color, fontWeight: "700" }}>Change Plan (Prorated)</Text>
      </TouchableOpacity>
    </View>
  );
}