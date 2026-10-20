// src/components/plan/MapPreview.tsx
import React from "react";
import { View, Image, StyleSheet, TouchableOpacity, Text, Linking, Platform } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  latitude: number;
  longitude: number;
  label?: string;
  cachedUri?: string | null; // <-- Added for Task 29 (Offline maps)
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { marginTop: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  mapImage: { width: "100%", height: 140, backgroundColor: c.bgSubtle },
  openBtn: {
    backgroundColor: c.bgElevated, padding: 10, alignItems: "center",
    borderTopWidth: 1, borderTopColor: c.border,
  },
  openBtnText: { color: c.primary, fontWeight: "700", fontSize: 13 },
});

export default function MapPreview({ latitude, longitude, label, cachedUri }: Props) {
  const styles = useThemedStyles(makeStyles);

  // Uses OpenStreetMap static maps (no API key required)
  const remoteMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=600x300&markers=${latitude},${longitude},red-pushpin`;
  
  // If we have a local cached image from the offline download, use it.
  // Otherwise, fallback to the remote URL.
  const imageSource = cachedUri ? { uri: cachedUri } : { uri: remoteMapUrl };

  const handleOpenMaps = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${label || "Location"}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label || "Location"})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    });
    
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <Image 
        source={imageSource} 
        style={styles.mapImage} 
        resizeMode="cover" 
      />
      <TouchableOpacity style={styles.openBtn} onPress={handleOpenMaps}>
        <Text style={styles.openBtnText}>📍 Open in Maps App</Text>
      </TouchableOpacity>
    </View>
  );
}