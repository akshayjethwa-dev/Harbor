// src/components/plan/BudgetProgress.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  spent: number;
  budget: number;
  participantCount: number;
  onEditBudget?: () => void;
  canEdit: boolean;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.bgElevated, padding: 20, margin: 16, borderRadius: 16,
    borderWidth: 1, borderColor: c.border,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  label: { fontSize: 13, color: c.textMuted, fontWeight: "700", textTransform: "uppercase" },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 },
  spentText: { fontSize: 32, fontWeight: "800", color: c.text },
  budgetText: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
  
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: c.bgSubtle, borderWidth: 1, borderColor: c.border },
  editBtnText: { fontSize: 12, fontWeight: "700", color: c.primary },

  progressTrack: { height: 10, backgroundColor: c.bgSubtle, borderRadius: 5, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 5 },
  
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusText: { fontSize: 13, fontWeight: "700" },
  perPersonText: { fontSize: 12, color: c.textSecondary, fontWeight: "600" },
  
  emptyBudget: { fontSize: 14, color: c.textMuted, fontStyle: "italic", textAlign: "center", marginVertical: 16 },
});

export default function BudgetProgress({ spent, budget, participantCount, onEditBudget, canEdit }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Edge Case: Budget = 0
  if (budget <= 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.label}>Total Spend</Text>
            <Text style={[styles.spentText, { color: colors.primary }]}>₹{spent.toFixed(2)}</Text>
          </View>
          {canEdit && onEditBudget && (
            <TouchableOpacity style={styles.editBtn} onPress={onEditBudget}>
              <Text style={styles.editBtnText}>Set Budget</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.emptyBudget}>No budget set for this plan.</Text>
      </View>
    );
  }

  const percentage = (spent / budget) * 100;
  const clampedPercentage = Math.min(percentage, 100); // Cap bar at 100%
  
  let barColor = colors.success;
  let statusLabel = "On track";
  if (percentage >= 100) {
    barColor = colors.danger;
    statusLabel = `Over budget by ₹${(spent - budget).toFixed(2)}`;
  } else if (percentage >= 80) {
    barColor = colors.warning;
    statusLabel = "Approaching limit";
  }

  const perPersonBudget = budget / (participantCount || 1);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.label}>Total Spend</Text>
          <View style={styles.amountRow}>
            <Text style={styles.spentText}>₹{spent.toFixed(2)}</Text>
            <Text style={styles.budgetText}>/ ₹{budget.toFixed(2)}</Text>
          </View>
        </View>
        {canEdit && onEditBudget && (
          <TouchableOpacity style={styles.editBtn} onPress={onEditBudget}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View 
          style={[styles.progressFill, { width: `${clampedPercentage}%`, backgroundColor: barColor }]} 
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.statusText, { color: barColor }]}>{statusLabel}</Text>
        <Text style={styles.perPersonText}>
          ₹{perPersonBudget.toFixed(2)} / person
        </Text>
      </View>
    </View>
  );
}