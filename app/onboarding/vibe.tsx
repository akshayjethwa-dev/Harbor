// app/onboarding/vibe.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { SocialVibe, UserIntent } from "../../src/types/user";

const INTENTS = [
  { id: "friends", label: "Make Friends", emoji: "🤝" },
  { id: "networking", label: "Networking", emoji: "💼" },
  { id: "dating", label: "Dating", emoji: "❤️" },
  { id: "hobbies", label: "Shared Hobbies", emoji: "🎨" },
];

const VIBES = [
  { id: "introvert", label: "Introvert", desc: "Quiet, deep chats" },
  { id: "extrovert", label: "Extrovert", desc: "Love meeting new people" },
  { id: "life_of_the_party", label: "Life of the Party", desc: "Center of the energy" },
  { id: "chill", label: "Chill & Go-with-the-flow", desc: "No stress, just vibes" },
];

const INTERESTS = ["Outdoors", "Foodie", "Arts", "Sports", "Gaming", "Tech", "Wellness", "Nightlife"];

export default function OnboardingVibeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleIntent = (id: string) => {
    setSelectedIntents(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleContinue = async () => {
    if (!user) return;
    if (!selectedVibe || selectedIntents.length === 0) {
      alert("Please select at least one intent and your social vibe.");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        intent: selectedIntents,
        socialVibe: selectedVibe,
        interests: selectedInterests,
        onboardingComplete: true,
      });
      router.replace("/(tabs)/plans" as any);
    } catch (error) {
      console.error(error);
      alert("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>What brings you here?</Text>
      <Text style={styles.subtitle}>Select all that apply</Text>
      <View style={styles.chipRow}>
        {INTENTS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.chip, selectedIntents.includes(item.id) && styles.chipSelected]}
            onPress={() => toggleIntent(item.id)}
          >
            <Text style={styles.chipEmoji}>{item.emoji}</Text>
            <Text style={[styles.chipText, selectedIntents.includes(item.id) && styles.textSelected]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.title, { marginTop: 32 }]}>Your Social Vibe</Text>
      <Text style={styles.subtitle}>How do you usually act in groups?</Text>
      <View style={{ gap: 10 }}>
        {VIBES.map((vibe) => (
          <TouchableOpacity
            key={vibe.id}
            style={[styles.card, selectedVibe === vibe.id && styles.cardSelected]}
            onPress={() => setSelectedVibe(vibe.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, selectedVibe === vibe.id && { color: "#E91E63" }]}>
                {vibe.label}
              </Text>
              <Text style={styles.cardDesc}>{vibe.desc}</Text>
            </View>
            {selectedVibe === vibe.id && <Text style={{ color: "#E91E63", fontSize: 20 }}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.title, { marginTop: 32 }]}>Your Interests</Text>
      <View style={[styles.chipRow, { marginTop: 12 }]}>
        {INTERESTS.map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[styles.chipSimple, selectedInterests.includes(interest) && styles.chipSimpleSelected]}
            onPress={() => toggleInterest(interest)}
          >
            <Text style={[styles.chipText, selectedInterests.includes(interest) && styles.textSelected]}>
              {interest}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && { opacity: 0.7 }]} 
        onPress={handleContinue}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "Saving..." : "Complete Profile"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A1A", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
    gap: 8,
  },
  chipSelected: { borderColor: "#E91E63", backgroundColor: "#FFF5F8" },
  chipEmoji: { fontSize: 18 },
  chipText: { fontSize: 14, fontWeight: "600", color: "#333" },
  textSelected: { color: "#E91E63" },
  chipSimple: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  chipSimpleSelected: { backgroundColor: "#FFF5F8", borderWidth: 1.5, borderColor: "#E91E63" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFF",
  },
  cardSelected: { borderColor: "#E91E63", backgroundColor: "#FFF5F8" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  cardDesc: { fontSize: 13, color: "#666", marginTop: 2 },
  button: {
    marginTop: 40,
    backgroundColor: "#E91E63",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});