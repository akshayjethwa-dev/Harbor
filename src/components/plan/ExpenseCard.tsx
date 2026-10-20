// src/components/plan/ExpenseCard.tsx
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { PlanExpense } from "../../types/expense";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";
import ReactionBar from "./ReactionBar"; // <-- Added

interface Props {
  expense: PlanExpense;
  onDelete?: () => void;
  canDelete?: boolean;
  onDispute?: () => void;
  onResolve?: () => void;
  onComment?: () => void;
  planId?: string; // <-- Added for Reactions
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.bgElevated, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center",
  },
  cardFrozen: {
    borderColor: c.warning, backgroundColor: c.warning + "11",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarFallback: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: c.bgSubtle,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  avatarInitial: { fontSize: 16, fontWeight: "700", color: c.textMuted },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: c.text },
  meta: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  amountCol: { alignItems: "flex-end" },
  amount: { fontSize: 16, fontWeight: "800", color: c.text },
  foreignAmount: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  postPlanBadge: {
    backgroundColor: c.warning + "22", paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginTop: 4,
  },
  postPlanText: { fontSize: 9, fontWeight: "800", color: c.warning },
  deleteBtn: { marginLeft: 12, padding: 8 },
  deleteText: { color: c.danger, fontSize: 18, fontWeight: "bold" },
  
  // Dispute Styles
  frozenBanner: {
    backgroundColor: c.warning, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 6
  },
  frozenText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1,
  },
  actionText: { fontSize: 12, fontWeight: "700" },
});

export default function ExpenseCard({ expense, onDelete, canDelete, onDispute, onResolve, onComment, planId }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();

  const isFrozen = expense.isFrozen;
  const pendingDisputes = (expense.disputes || []).filter(d => d.status === "pending");
  
  const canDispute = user?.uid !== expense.paidByUid && !isFrozen && !expense.isPostPlan;
  const canResolve = pendingDisputes.length > 0;

  const dateStr = expense.createdAt?.toDate
    ? expense.createdAt.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";

  return (
    <View style={[styles.card, isFrozen && styles.cardFrozen]}>
      {expense.paidByPhotoUrl ? (
        <Image source={{ uri: expense.paidByPhotoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>
            {expense.paidByName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {isFrozen && (
          <View style={styles.frozenBanner}>
            <Text style={styles.frozenText}>🚨 FROZEN: DISPUTED</Text>
          </View>
        )}

        <Text style={styles.title} numberOfLines={1}>{expense.description}</Text>
        <Text style={styles.meta}>
          {expense.paidByName} paid • {dateStr}
        </Text>

        <View style={styles.actionRow}>
          {canDispute && onDispute && (
            <TouchableOpacity style={[styles.actionBtn, { borderColor: "#F44336" }]} onPress={onDispute}>
              <Text style={[styles.actionText, { color: "#F44336" }]}>Dispute</Text>
            </TouchableOpacity>
          )}
          {canResolve && onResolve && (
            <TouchableOpacity style={[styles.actionBtn, { borderColor: "#FF9800", backgroundColor: "#FF9800" }]} onPress={onResolve}>
              <Text style={[styles.actionText, { color: "#FFF" }]}>Resolve ({pendingDisputes.length})</Text>
            </TouchableOpacity>
          )}
          {onComment && (
            <TouchableOpacity style={[styles.actionBtn, { borderColor: "#2196F3" }]} onPress={onComment}>
              <Text style={[styles.actionText, { color: "#2196F3" }]}>💬 Comment</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Task 21: Reactions */}
        {planId && (
          <ReactionBar
            planId={planId}
            itemId={expense.id}
            collectionName="expenses"
            reactions={expense.reactions}
            currentUserId={user?.uid || ""}
          />
        )}
      </View>

      <View style={styles.amountCol}>
        <Text style={styles.amount}>
          ₹{expense.amount.toFixed(2)}
        </Text>
        {expense.originalAmount && expense.exchangeRate && (
          <Text style={styles.foreignAmount}>
            {expense.currency} {expense.originalAmount} @ {expense.exchangeRate}
          </Text>
        )}
      </View>

      {canDelete && onDelete && !isFrozen && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}