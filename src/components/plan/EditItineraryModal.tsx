// src/components/plan/EditItineraryModal.tsx
import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ScrollView, KeyboardAvoidingView, Switch } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Timestamp } from "firebase/firestore";
import { ItineraryItem } from "../../types/itinerary";
import { Plan } from "../../types/plan";
import LocationSearch from "./LocationSearch";
import MapPreview from "./MapPreview";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (updates: Partial<ItineraryItem>) => Promise<void>;
  item: ItineraryItem | null;
  plan: Plan;
  existingItems: ItineraryItem[];
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: c.bg, borderRadius: 16, padding: 20, maxHeight: "90%" },
  title: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: c.textMuted, marginBottom: 6, textTransform: "uppercase", marginTop: 12 },
  input: { backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", gap: 10 },
  chip: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: c.border, alignItems: "center", backgroundColor: c.bgSubtle },
  chipActive: { borderColor: c.primary, backgroundColor: c.primary + "11" },
  chipText: { fontSize: 13, fontWeight: "700", color: c.textSecondary },
  chipTextActive: { color: c.primary },
  saveBtn: { backgroundColor: c.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 20 },
  saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
});

export default function EditItineraryModal({ visible, onClose, onSave, item, plan, existingItems }: Props) {
  const styles = useThemedStyles(makeStyles);

  const [title, setTitle] = useState("");
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [isFixedTime, setIsFixedTime] = useState(false);
  
  // Task 26: Location Data State
  const [locationAddress, setLocationAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible && item) {
      setTitle(item.title);
      setDayIndex(item.dayIndex);
      setTime(item.startAt ? item.startAt.toDate() : null);
      setIsFixedTime(item.isFixedTime || false);
      
      // Load location data
      setLocationAddress(item.locationAddress || item.location || "");
      setLat(item.latitude ?? null);
      setLng(item.longitude ?? null);
    }
  }, [visible, item]);

  if (!item || !plan) return null;

  const totalDays = Math.max(1, Math.ceil((plan.endTime?.toMillis?.() - plan.startTime?.toMillis?.()) / (1000 * 60 * 60 * 24)) || 1);

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Error", "Title required.");

    let startAt: Timestamp | null = null;
    let endAt: Timestamp | null = null;

    if (dayIndex !== null && time) {
      // Combine plan start date + dayIndex + time
      const planDate = plan.startTime.toDate();
      const targetDate = new Date(planDate);
      targetDate.setDate(targetDate.getDate() + dayIndex);
      targetDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
      
      startAt = Timestamp.fromDate(targetDate);
      
      // End time is defaulted to 1 hour later if we don't have a duration
      const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000);
      endAt = Timestamp.fromDate(endDate);
    }

    // Check overlaps
    if (startAt && endAt) {
      const overlaps = existingItems.filter((i) => {
        if (i.id === item.id || i.dayIndex !== dayIndex || !i.startAt || !i.endAt) return false;
        return (startAt!.toMillis() < i.endAt.toMillis() && endAt!.toMillis() > i.startAt.toMillis());
      });

      if (overlaps.length > 0) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Time Overlap",
            "This time overlaps with another activity. Add anyway?",
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Add anyway", onPress: () => resolve(true) },
            ]
          );
        });
        if (!proceed) return;
      }
    }

    await onSave({
      title: title.trim(),
      dayIndex,
      startAt,
      endAt,
      location: locationAddress.trim() || null,
      locationAddress: locationAddress.trim() || null,
      latitude: lat,
      longitude: lng,
      isFixedTime, // <-- Task 28: Save the fixed time status
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Edit Itinerary Item</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} />

            <Text style={styles.label}>Assign to Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              <TouchableOpacity 
                style={[styles.chip, dayIndex === null && styles.chipActive]} 
                onPress={() => setDayIndex(null)}
              >
                <Text style={[styles.chipText, dayIndex === null && styles.chipTextActive]}>Unplanned</Text>
              </TouchableOpacity>
              {Array.from({ length: totalDays }).map((_, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.chip, dayIndex === i && styles.chipActive]} 
                  onPress={() => setDayIndex(i)}
                >
                  <Text style={[styles.chipText, dayIndex === i && styles.chipTextActive]}>Day {i + 1}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {dayIndex !== null && (
              <>
                <Text style={styles.label}>Start Time</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
                  <Text style={{ color: time ? styles.input.color : styles.label.color }}>
                    {time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Select Time"}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={time || new Date()}
                    mode="time"
                    display="default"
                    onChange={(event, selected) => {
                      setShowTimePicker(Platform.OS === "ios");
                      if (selected) setTime(selected);
                    }}
                  />
                )}

                {/* Task 28: Fixed Time Switch */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, backgroundColor: styles.input.backgroundColor, padding: 12, borderRadius: 10 }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: styles.input.color }}>Fixed Time</Text>
                    <Text style={{ fontSize: 12, color: styles.label.color, marginTop: 2 }}>Lock this time (e.g. reservations) so it is not moved by the route optimizer.</Text>
                  </View>
                  <Switch value={isFixedTime} onValueChange={setIsFixedTime} />
                </View>
              </>
            )}

            {/* Task 26: Location Search & Map Preview */}
            <Text style={styles.label}>Location</Text>
            <LocationSearch
              initialValue={locationAddress}
              onSelect={(data) => {
                setLocationAddress(data.address);
                setLat(data.lat);
                setLng(data.lng);
              }}
            />

            {lat != null && lng != null && (
              <MapPreview latitude={lat} longitude={lng} label={locationAddress} />
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: "#E0E0E0" }]} onPress={onClose}>
                <Text style={{ color: "#333", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}