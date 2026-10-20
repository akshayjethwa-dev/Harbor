// src/components/plan/ItineraryItemCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ItineraryItem } from "../../types/itinerary";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  item: ItineraryItem;
  isActive?: boolean;
  onLongPress?: () => void;
  onPress: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.bgElevated, borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center",
  },
  cardActive: { borderColor: c.primary, transform: [{ scale: 1.02 }], elevation: 4 },
  timeCol: { width: 60, alignItems: "flex-start", borderRightWidth: 1, borderRightColor: c.border, marginRight: 12, paddingRight: 8 },
  timeText: { fontSize: 12, fontWeight: "700", color: c.primary },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: c.text },
  meta: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  dragHandle: { padding: 8, marginLeft: 8 },
  dragText: { fontSize: 18, color: c.textMuted },
  removeBtn: { padding: 8, marginLeft: 8 },
  removeText: { color: c.danger, fontSize: 12, fontWeight: "700" },
});

export default function ItineraryItemCard({ item, isActive, onLongPress, onPress, onRemove, showRemove }: Props) {
  const styles = useThemedStyles(makeStyles);

  const timeStr = item.startAt?.toDate
    ? item.startAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "TBD";

  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
      disabled={!onPress && !onLongPress}
      activeOpacity={0.8}
    >
      {item.dayIndex !== null && (
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{timeStr}</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        
        {/* Task 26: Display location if available */}
        {item.locationAddress || item.location ? (
          <Text style={styles.meta} numberOfLines={1}>
            📍 {item.locationAddress || item.location}
          </Text>
        ) : null}
        
        {item.estimatedCost != null && (
          <Text style={styles.meta}>₹{item.estimatedCost}</Text>
        )}
      </View>

      {showRemove && onRemove && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      )}

      {onLongPress && (
        <View style={styles.dragHandle}>
          <Text style={styles.dragText}>≡</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}