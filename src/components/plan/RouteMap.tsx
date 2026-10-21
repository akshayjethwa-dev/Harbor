// src/components/plan/RouteMap.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
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
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: c.textSecondary, textAlign: "center" },
  warningBanner: {
    position: "absolute", top: 16, left: 16, right: 16,
    backgroundColor: c.warning, padding: 12, borderRadius: 10,
    flexDirection: "row", alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 4,
  },
  warningText: { color: "#FFF", fontSize: 12, fontWeight: "700", flex: 1 },
  pin: {
    backgroundColor: c.primary, width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#FFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, elevation: 4,
  },
  pinText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  infoCard: {
    position: "absolute", bottom: 24, left: 16, right: 16,
    backgroundColor: c.bgElevated, padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: c.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, elevation: 5,
  },
  infoTitle: { fontSize: 16, fontWeight: "800", color: c.text },
  infoMeta: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
});

export default function RouteMap({ items, onSelectItem }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const stops = useMemo(() => prepareMapStops(items), [items]);

  if (stops.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyTitle}>No Locations Found</Text>
        <Text style={styles.emptyText}>
          Add locations to your itinerary items to see them mapped out here.
        </Text>
      </View>
    );
  }

  const coordinates = stops.map((s) => ({
    latitude: s.latitude!,
    longitude: s.longitude!,
  }));

  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalDistance += calculateDistance(
      coordinates[i].latitude, coordinates[i].longitude,
      coordinates[i + 1].latitude, coordinates[i + 1].longitude
    );
  }

  const isLongDistance = totalDistance > 50;
  const isTooManyStops = stops.length > 10;

  const initialRegion = {
    latitude: coordinates[0].latitude,
    longitude: coordinates[0].longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        // provider={PROVIDER_GOOGLE} // Uncomment if using a dev build with Google Maps on iOS
      >
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        )}

        {stops.map((stop, index) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.latitude!, longitude: stop.longitude! }}
            onPress={() => onSelectItem(stop)}
          >
            <View style={styles.pin}>
              <Text style={styles.pinText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {(isLongDistance || isTooManyStops) && (
        <View style={styles.warningBanner}>
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <Text style={styles.warningText}>
            {isLongDistance 
              ? "Stops span a large distance (>50km). Route may be impractical." 
              : "More than 10 stops. Map route may be complex."}
          </Text>
        </View>
      )}
    </View>
  );
}