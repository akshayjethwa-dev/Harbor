import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { submitVendorApplication } from "../../src/services/monetizationService";
import { VendorCategory } from "../../src/types/monetization";

const CATEGORIES: { value: VendorCategory; label: string; emoji: string }[] = [
  { value: "photographer", label: "Photographer", emoji: "📸" },
  { value: "venue", label: "Venue", emoji: "🏛️" },
  { value: "catering", label: "Catering", emoji: "🍽️" },
  { value: "dj", label: "DJ", emoji: "🎧" },
  { value: "makeup", label: "Makeup", emoji: "💄" },
  { value: "transport", label: "Transport", emoji: "🚗" },
  { value: "other", label: "Other", emoji: "✨" },
];

export default function VendorOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<VendorCategory | null>(null);
  const [city, setCity] = useState(user?.city ?? "");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [panNumber, setPanNumber] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (!name.trim() || !category || !city.trim() || !phone.trim()) {
      Alert.alert("Missing info", "Name, category, city, and phone are required.");
      return;
    }

    setSubmitting(true);
    try {
      await submitVendorApplication({
        name: name.trim(),
        category,
        city: city.trim(),
        description: description.trim(),
        portfolioUrls: [],
        phone: phone.trim(),
        panNumber: panNumber.trim(),
        priceFrom: parseInt(priceFrom, 10) || 0,
        ownerUid: user.uid,
      });
      Alert.alert(
        "Application submitted! 🎉",
        "Our team will review within 3 business days."
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Submission failed", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendor Listing</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            List your services on Harbor. We charge a{" "}
            <Text style={styles.bold}>15-20% commission</Text> per booking.
          </Text>

          <Text style={styles.label}>Business name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Snap Studios"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryText,
                      active && styles.categoryTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Mumbai"
            placeholderTextColor="#999"
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell customers what makes your service special"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.label}>Contact phone</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>PAN number</Text>
          <TextInput
            style={styles.input}
            placeholder="ABCDE1234F"
            placeholderTextColor="#999"
            value={panNumber}
            onChangeText={(t) => setPanNumber(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
          />

          <Text style={styles.label}>Starting price (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 5000"
            placeholderTextColor="#999"
            value={priceFrom}
            onChangeText={(t) => setPriceFrom(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitText}>Submit application</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backText: { fontSize: 22, color: "#666", fontWeight: "600", width: 24 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 13, color: "#666", lineHeight: 20, marginBottom: 20 },
  bold: { fontWeight: "800", color: "#E91E63" },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  textArea: { height: 100, paddingTop: 14 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  categoryChipActive: { borderColor: "#E91E63", backgroundColor: "#FFF0F5" },
  categoryEmoji: { fontSize: 14, marginRight: 6 },
  categoryText: { fontSize: 13, fontWeight: "600", color: "#666" },
  categoryTextActive: { color: "#E91E63" },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  submitBtn: {
    height: 54,
    backgroundColor: "#E91E63",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});