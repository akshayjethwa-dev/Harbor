import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { usePlanCreateStore } from "../../store/planCreateStore";
import { CITIES } from "../../constants/activities";

export default function Step3Location() {
  const { draft, updateDraft } = usePlanCreateStore();
  const [loading, setLoading] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [customCityMode, setCustomCityMode] = useState(false);
  const [customCity, setCustomCity] = useState("");

  // Filter cities by search term
  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [citySearch]);

  const detectLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Location permission denied. Please enter your city manually.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      let city = "";
      let area = "";

      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&localityLanguage=en`
        );
        if (response.ok) {
          const geo = await response.json();
          city = geo.city || geo.locality || geo.principalSubdivision || "";
          area = geo.locality || "";
        }
      } catch (e) {
        console.warn("Reverse geocode failed:", e);
      }

      // ✅ FIX: `PlanDraft` doesn't have an `area` field.
      // We use the detected area as a starting point for `locationAddress`
      // (user can edit it in the "Address" field below).
      updateDraft({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        city: city || draft.city,
        locationAddress: area || draft.locationAddress,
      });
    } catch (e) {
      console.warn(e);
      alert("Could not detect location. Please enter manually.");
    } finally {
      setLoading(false);
    }
  };

  const selectCity = (city: string) => {
    updateDraft({ city });
    setShowCityModal(false);
    setCitySearch("");
    setCustomCityMode(false);
  };

  const confirmCustomCity = () => {
    const trimmed = customCity.trim();
    if (!trimmed) return;
    updateDraft({ city: trimmed });
    setShowCityModal(false);
    setCustomCity("");
    setCustomCityMode(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Where?</Text>

      {/* Auto-detect */}
      <TouchableOpacity
        style={styles.detectBtn}
        onPress={detectLocation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#E91E63" />
        ) : (
          <Text style={styles.detectText}>📍 Auto-detect my location</Text>
        )}
      </TouchableOpacity>

      {/* City selector */}
      <Text style={styles.label}>City</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowCityModal(true)}
        activeOpacity={0.7}
      >
        <Text style={draft.city ? styles.inputText : styles.placeholder}>
          {draft.city || "Select or type your city"}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Venue */}
      <Text style={styles.label}>Venue name</Text>
      <TextInput
        style={styles.inputNoChevron}
        placeholder="e.g., Juhu Beach"
        placeholderTextColor="#999"
        value={draft.locationName}
        onChangeText={(t) => updateDraft({ locationName: t })}
      />

      {/* Address */}
      <Text style={styles.label}>Address (optional)</Text>
      <TextInput
        style={styles.inputNoChevron}
        placeholder="Full address"
        placeholderTextColor="#999"
        value={draft.locationAddress}
        onChangeText={(t) => updateDraft({ locationAddress: t })}
      />

      {/* ─── City picker modal ─── */}
      <Modal
        visible={showCityModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCityModal(false);
          setCustomCityMode(false);
          setCitySearch("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {customCityMode ? "Enter your city" : "Select City"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCityModal(false);
                  setCustomCityMode(false);
                  setCitySearch("");
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {customCityMode ? (
              // ─── Custom city input mode ───
              <View style={styles.customCityBox}>
                <TextInput
                  style={styles.customCityInput}
                  placeholder="Type your city name"
                  placeholderTextColor="#999"
                  value={customCity}
                  onChangeText={setCustomCity}
                  autoFocus
                  maxLength={40}
                />
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    !customCity.trim() && { opacity: 0.5 },
                  ]}
                  onPress={confirmCustomCity}
                  disabled={!customCity.trim()}
                >
                  <Text style={styles.confirmText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setCustomCityMode(false);
                    setCustomCity("");
                  }}
                  style={styles.backToList}
                >
                  <Text style={styles.backToListText}>← Back to list</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // ─── Search + list mode ───
              <>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search cities…"
                  placeholderTextColor="#999"
                  value={citySearch}
                  onChangeText={setCitySearch}
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={styles.customCityRow}
                  onPress={() => setCustomCityMode(true)}
                >
                  <Text style={styles.customCityIcon}>✏️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customCityTitle}>
                      Use custom city
                    </Text>
                    <Text style={styles.customCitySub}>
                      City not in the list? Type it in.
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                <FlatList
                  data={filteredCities}
                  keyExtractor={(item) => item}
                  style={styles.cityList}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.cityItem,
                        item === draft.city && styles.cityItemActive,
                      ]}
                      onPress={() => selectCity(item)}
                    >
                      <Text
                        style={[
                          styles.cityText,
                          item === draft.city && styles.cityTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                      {item === draft.city && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      No cities match "{citySearch}"
                    </Text>
                  }
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A1A", marginBottom: 24 },
  detectBtn: {
    borderWidth: 1.5,
    borderColor: "#E91E63",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  detectText: { fontSize: 15, fontWeight: "600", color: "#E91E63" },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
  },
  inputNoChevron: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  inputText: { fontSize: 16, color: "#333" },
  placeholder: { fontSize: 16, color: "#999" },
  chevron: { fontSize: 22, color: "#CCC" },
  // ─── Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  modalClose: { fontSize: 20, color: "#666", padding: 4 },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  customCityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  customCityIcon: { fontSize: 20 },
  customCityTitle: { fontSize: 14, fontWeight: "700", color: "#333" },
  customCitySub: { fontSize: 12, color: "#999", marginTop: 2 },
  cityList: { flexGrow: 0 },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  cityItemActive: { backgroundColor: "#FFF0F5" },
  cityText: { fontSize: 15, color: "#333" },
  cityTextActive: { color: "#E91E63", fontWeight: "700" },
  checkmark: { color: "#E91E63", fontSize: 16, fontWeight: "800" },
  emptyText: {
    textAlign: "center",
    padding: 24,
    color: "#999",
    fontSize: 14,
  },
  // ─── Custom city entry ───
  customCityBox: { paddingHorizontal: 20, paddingBottom: 20 },
  customCityInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
    color: "#333",
    marginBottom: 12,
  },
  confirmBtn: {
    backgroundColor: "#E91E63",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  backToList: { paddingVertical: 12, alignItems: "center" },
  backToListText: { color: "#E91E63", fontSize: 14, fontWeight: "600" },
});