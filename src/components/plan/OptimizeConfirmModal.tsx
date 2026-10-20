// src/components/plan/OptimizeConfirmModal.tsx
import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ItineraryItem } from "../../types/itinerary";
import { calculateTotalDistance, estimateTravelTime } from "../../services/routeService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  originalItems: ItineraryItem[];
  optimizedItems: ItineraryItem[];
  onConfirm: () => void;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: c.bg, borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 16 },
  compareRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  column: { flex: 1, alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  columnActive: { backgroundColor: c.success + "11", borderColor: c.success },
  label: { fontSize: 12, color: c.textMuted, fontWeight: "700", textTransform: "uppercase" },
  value: { fontSize: 18, fontWeight: "800", color: c.text, marginTop: 4 },
  savedText: { fontSize: 14, color: c.success, fontWeight: "700", textAlign: "center", marginBottom: 24 },
  row: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
  btnGhost: { borderWidth: 1, borderColor: c.border },
  btnGhostText: { color: c.textSecondary, fontWeight: "700" },
  btnPrimary: { backgroundColor: c.success },
  btnPrimaryText: { color: "#FFF", fontWeight: "700" },
});

export default function OptimizeConfirmModal({ visible, onClose, originalItems, optimizedItems, onConfirm }: Props) {
  const styles = useThemedStyles(makeStyles);

  if (!visible) return null;

  const originalDist = calculateTotalDistance(originalItems);
  const optimizedDist = calculateTotalDistance(optimizedItems);
  const savedDist = originalDist - optimizedDist;

  const originalTime = estimateTravelTime(originalDist);
  const optimizedTime = estimateTravelTime(optimizedDist);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Route Optimized</Text>
          
          <View style={styles.compareRow}>
            <View style={[styles.column, { marginRight: 10 }]}>
              <Text style={styles.label}>Original</Text>
              <Text style={styles.value}>{originalTime}</Text>
              <Text style={{ fontSize: 11, color: styles.label.color, marginTop: 4 }}>{originalDist.toFixed(1)} km</Text>
            </View>
            <View style={[styles.column, styles.columnActive]}>
              <Text style={styles.label}>Optimized</Text>
              <Text style={styles.value}>{optimizedTime}</Text>
              <Text style={{ fontSize: 11, color: styles.columnActive.borderColor, marginTop: 4 }}>{optimizedDist.toFixed(1)} km</Text>
            </View>
          </View>

          {savedDist > 0.1 && (
            <Text style={styles.savedText}>
              🎉 Saves ~{estimateTravelTime(savedDist)} of travel time!
            </Text>
          )}

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={styles.btnGhostText}>Revert</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onConfirm}>
              <Text style={styles.btnPrimaryText}>Apply New Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}