// app/onboarding.tsx
import React, { useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, Dimensions, 
  SafeAreaView, Platform 
} from "react-native";
import { useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import { useAuth } from "../src/context/AuthContext";
import { useTheme } from "../src/theme/ThemeContext";
import { useThemedStyles } from "../src/hooks/useThemedStyles";
import { ThemeColors } from "../src/theme/colors";

const { width } = Dimensions.get("window");

const STEPS = [
  {
    emoji: "👋",
    title: "Welcome to Kithra",
    desc: "The easiest way to find and join plans with your crew. Let's take a quick tour.",
  },
  {
    emoji: "🗺️",
    title: "Discover Plans",
    desc: "Browse public plans near you or create your own. Find your next adventure in seconds.",
  },
  {
    emoji: "📊",
    title: "Organize & Vote",
    desc: "Use Date Polls to pick the best time, track expenses, and assign tasks so everything runs smoothly.",
  },
  {
    emoji: "🛡️",
    title: "Safety First",
    desc: "We've got your back. Share your live location and set up emergency contacts for peace of mind.",
  },
];

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, justifyContent: "center" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emoji: { fontSize: 80, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "900", color: c.text, marginBottom: 16, textAlign: "center" },
  desc: { fontSize: 16, color: c.textSecondary, textAlign: "center", lineHeight: 24 },
  footer: { padding: 24, paddingBottom: Platform.OS === "ios" ? 48 : 24 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
  dotActive: { backgroundColor: c.primary, width: 24 },
  btnRow: { flexDirection: "row", gap: 12 },
  button: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center" },
  skipBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: c.border },
  skipText: { color: c.textSecondary, fontWeight: "700", fontSize: 16 },
  nextBtn: { backgroundColor: c.primary },
  nextText: { color: c.textInverse, fontWeight: "700", fontSize: 16 },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    if (user?.uid) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          hasSeenOnboarding: true,
        });
      } catch (e) {
        console.warn("Failed to save onboarding state", e);
      }
    }
    
    // Redirect to the main app
    router.replace("/(tabs)/crews" as any);
  };

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{step.emoji}</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.desc}>{step.desc}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.btnRow}>
          {!isLast && (
            <TouchableOpacity style={[styles.button, styles.skipBtn]} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.button, styles.nextBtn]} onPress={handleNext}>
            <Text style={styles.nextText}>{isLast ? "Get Started" : "Next"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}