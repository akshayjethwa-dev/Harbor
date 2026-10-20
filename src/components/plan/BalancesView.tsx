// src/components/plan/BalancesView.tsx
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Settlement } from "../../types/expense";
import { PlanParticipant } from "../../types/plan";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  netBalances: Record<string, number>;
  settlements: Settlement[];
  participants: PlanParticipant[];
  onSettle: (settlement: Settlement) => void; // <-- Added
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: c.text, marginBottom: 12 },
  emptyCard: {
    backgroundColor: c.success + "11", padding: 24, borderRadius: 16,
    alignItems: "center", borderWidth: 1, borderColor: c.success + "33",
  },
  emptyText: { fontSize: 16, fontWeight: "700", color: c.success },
  emptySub: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
  
  card: {
    backgroundColor: c.bgElevated, borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: c.border,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  userCol: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.bgSubtle,
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 14, fontWeight: "700", color: c.textMuted },
  name: { fontSize: 15, fontWeight: "600", color: c.text },
  
  amountPositive: { fontSize: 16, fontWeight: "800", color: c.success }, // Green (owed)
  amountNegative: { fontSize: 16, fontWeight: "800", color: c.danger }, // Red (owes)

  settleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 8, backgroundColor: c.bgSubtle, padding: 12, borderRadius: 10,
  },
  settleText: { fontSize: 14, color: c.textSecondary, fontWeight: "600" },
  settleHighlight: { color: c.primary, fontWeight: "800" },
  settleBtn: {
    backgroundColor: c.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
  },
  settleBtnText: { color: c.textInverse, fontWeight: "700", fontSize: 12 },
});

export default function BalancesView({ netBalances, settlements, participants, onSettle }: Props) {
  const styles = useThemedStyles(makeStyles);

  const hasDebts = settlements.length > 0;

  return (
    <View style={styles.container}>
      {/* Settlements (Who pays whom) */}
      <Text style={styles.sectionTitle}>Settle Up</Text>
      
      {!hasDebts ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>🎉 All settled up!</Text>
          <Text style={styles.emptySub}>No one owes anything.</Text>
        </View>
      ) : (
        settlements.map((s, idx) => (
          <View key={idx} style={styles.settleRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.settleText}>
                <Text style={styles.settleHighlight}>{s.fromName}</Text> owes{" "}
                <Text style={styles.settleHighlight}>{s.toName}</Text>
              </Text>
            </View>
            
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[styles.settleText, { fontWeight: "800", color: styles.name.color }]}>
                ₹{s.amount.toFixed(2)}
              </Text>
              <TouchableOpacity style={styles.settleBtn} onPress={() => onSettle(s)}>
                <Text style={styles.settleBtnText}>Settle</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Net Balances</Text>
      
      {/* Net Balances list */}
      {participants.map((p) => {
        const balance = netBalances[p.uid] || 0;
        if (Math.abs(balance) < 0.01) return null; // Hide settled users from net list

        const isPositive = balance > 0;

        return (
          <View key={p.uid} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.userCol}>
                {p.photoUrl ? (
                  <Image source={{ uri: p.photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {p.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.name}>{p.name}</Text>
              </View>
              <Text style={isPositive ? styles.amountPositive : styles.amountNegative}>
                {isPositive ? "+" : "-"}₹{Math.abs(balance).toFixed(2)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}