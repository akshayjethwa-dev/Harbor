// src/components/plan/CollectRequestCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CollectRequest, CollectTarget } from "../../types/collect";
import { updateTargetStatus } from "../../services/collectService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  request: CollectRequest;
  isOrganizer: boolean;
  currentUserId: string;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: c.bgElevated, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800", color: c.text },
  amount: { fontSize: 16, fontWeight: "800", color: c.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: c.bgSubtle },
  statusText: { fontSize: 10, fontWeight: "800", color: c.textSecondary },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  name: { fontSize: 14, fontWeight: "600", color: c.text },
  targetAmount: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginRight: 8 },
  status: { fontSize: 12, fontWeight: "700" },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: c.primary + "11" },
  actionText: { fontSize: 11, fontWeight: "700", color: c.primary },
});

export default function CollectRequestCard({ request, isOrganizer, currentUserId }: Props) {
  const styles = useThemedStyles(makeStyles);
  
  const isExpired = request.status === "expired";

  const handleAction = async (target: CollectTarget) => {
    if (isExpired) return;

    if (isOrganizer && target.uid !== currentUserId) {
      // Organizer marking someone else as paid
      const options = ["Mark Paid", "Mark Pending", "Cancel"];
      Alert.alert(`Update ${target.name}`, "What is the current status?", [
        { text: "Mark Paid", onPress: () => updateTargetStatus(request.planId, request.id, target.uid, "paid") },
        { text: "Mark Pending", onPress: () => updateTargetStatus(request.planId, request.id, target.uid, "pending") },
        { text: "Cancel", style: "cancel" }
      ]);
    } else if (target.uid === currentUserId) {
      // Current user is the target
      Alert.alert("Settle Up", `You owe ${request.organizerName} ₹${target.amount}.`, [
        { text: "Decline", style: "destructive", onPress: () => updateTargetStatus(request.planId, request.id, target.uid, "declined") },
        { text: "Mark as Paid", onPress: () => updateTargetStatus(request.planId, request.id, target.uid, "paid") },
        { text: "Cancel", style: "cancel" }
      ]);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{request.title}</Text>
          <Text style={{ fontSize: 12, color: styles.statusText.color, marginTop: 2 }}>
            From {request.organizerName}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.amount}>₹{request.totalAmount.toFixed(2)}</Text>
          <View style={[styles.statusBadge, isExpired && { backgroundColor: styles.row.borderBottomColor }]}>
            <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {request.targets.map(t => {
        let color = styles.statusText.color as string;
        if (t.status === "paid") color = "#4CAF50";
        if (t.status === "declined") color = "#F44336";
        if (t.status === "excluded") color = "#FF9800";

        return (
          <View key={t.uid} style={styles.row}>
            <View>
              <Text style={styles.name}>{t.name}</Text>
              {t.status === "excluded" && <Text style={{ fontSize: 10, color }}>No UPI ID</Text>}
            </View>
            
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.targetAmount}>₹{t.amount.toFixed(2)}</Text>
              <Text style={[styles.status, { color }]}>{t.status.toUpperCase()}</Text>
              
              {!isExpired && (t.status === "pending" || isOrganizer) && (
                <TouchableOpacity style={[styles.actionBtn, { marginLeft: 8 }]} onPress={() => handleAction(t)}>
                  <Text style={styles.actionText}>Update</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}