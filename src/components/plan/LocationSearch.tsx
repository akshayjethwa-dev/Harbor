// src/components/plan/LocationSearch.tsx
import React, { useState } from "react";
import { View, TextInput, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { searchLocations, getPlaceDetails, PlacePrediction } from "../../services/locationService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  initialValue?: string;
  onSelect: (data: { address: string; lat: number | null; lng: number | null }) => void;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { position: "relative", zIndex: 10 },
  input: { backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border },
  dropdown: {
    position: "absolute", top: 50, left: 0, right: 0,
    backgroundColor: c.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    maxHeight: 200, zIndex: 20, elevation: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5,
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  dropdownText: { fontSize: 14, color: c.text },
  loadingBox: { padding: 12, alignItems: "center" },
});

export default function LocationSearch({ initialValue, onSelect }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [query, setQuery] = useState(initialValue || "");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    // Allow manual entry
    onSelect({ address: text, lat: null, lng: null });

    if (text.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    const results = await searchLocations(text);
    setPredictions(results);
    setShowDropdown(results.length > 0);
    setLoading(false);
  };

  const handleSelect = async (placeId: string, description: string) => {
    setShowDropdown(false);
    setLoading(true);
    setQuery(description);
    
    const details = await getPlaceDetails(placeId);
    setLoading(false);

    if (details) {
      onSelect({
        address: details.address,
        lat: details.latitude,
        lng: details.longitude,
      });
    } else {
      // Fallback to manual entry if details fail
      onSelect({ address: description, lat: null, lng: null });
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for a place or type manually..."
        placeholderTextColor={styles.input.color}
        value={query}
        onChangeText={handleSearch}
        onFocus={() => query.length >= 3 && predictions.length > 0 && setShowDropdown(true)}
      />

      {showDropdown && (
        <View style={styles.dropdown}>
          {loading ? (
            <View style={styles.loadingBox}><ActivityIndicator size="small" /></View>
          ) : (
            predictions.map((p) => (
              <TouchableOpacity key={p.placeId} style={styles.dropdownItem} onPress={() => handleSelect(p.placeId, p.description)}>
                <Text style={styles.dropdownText} numberOfLines={2}>📍 {p.description}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}