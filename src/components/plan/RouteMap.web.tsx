// src/components/plan/RouteMap.web.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ItineraryItem } from "../../types/itinerary";
import { prepareMapStops, calculateDistance, estimateTravelTime } from "../../services/routeService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  items: ItineraryItem[];
  onSelectItem: (item: ItineraryItem) => void;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: 16 },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: c.textSecondary, textAlign: "center" },
  stopRow: {
    flexDirection: "row", marginBottom: 16,
  },
  timeline: { width: 30, alignItems: "center" },
  pin: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: c.primary,
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  pinText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  line: { width: 2, flex: 1, backgroundColor: c.border, marginTop: 4 },
  content: {
    flex: 1, backgroundColor: c.bgElevated, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: c.border, marginLeft: 12,
  },
  title: { fontSize: 16, fontWeight: "700", color: c.text },
  meta: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
  travelTime: {
    fontSize: 12, color: c.primary, fontWeight: "600", marginTop: 8,
    backgroundColor: c.primary + "11", padding: 4, borderRadius: 4, alignSelf: "flex-start"
  },
});

export default function RouteMapWeb({ items, onSelectItem }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const stops = useMemo(() => prepareMapStops(items), [items]);

  if (stops.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyTitle}>No Locations Found</Text>
        <Text style={styles.emptyText}>
          Add locations to your itinerary items to see them listed here. (Interactive map view is available on the mobile app).
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: "600" }}>
          🗺️ Map view is available on the mobile app. Here is your route:
        </Text>
      </View>

      {stops.map((stop, index) => {
        let travelText = "";
        if (index < stops.length - 1) {
          const nextStop = stops[index + 1];
          if (stop.latitude && stop.longitude && nextStop.latitude && nextStop.longitude) {
            const dist = calculateDistance(stop.latitude, stop.longitude, nextStop.latitude, nextStop.longitude);
            travelText = estimateTravelTime(dist);
          }
        }

        return (
          <View key={stop.id} style={styles.stopRow}>
            <View style={styles.timeline}>
              <View style={styles.pin}>
                <Text style={styles.pinText}>{index + 1}</Text>
              </View>
              {index !== stops.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{stop.title}</Text>
              {stop.locationAddress && (
                <Text style={styles.meta}>📍 {stop.locationAddress}</Text>
              )}
              {travelText && (
                <Text style={styles.travelTime}>🚗 {travelText} to next stop</Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}