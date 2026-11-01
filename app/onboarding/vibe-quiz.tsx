// app/onboarding/vibe-quiz.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/theme/ThemeContext";
import { useVibeQuizStore } from "../../src/store/vibeQuizStore";
import { SocialEnergy, GroupSizePref, ActivityIntensity, ConversationStyle, PlanningStyle } from "../../src/types/quiz";

const QUESTIONS = [
  {
    key: "socialEnergy",
    title: "How do you recharge?",
    options: [
      { value: "introvert", label: "Quiet time alone", desc: "Small groups, deep chats" },
      { value: "ambivert", label: "A mix of both", desc: "Depends on the day" },
      { value: "extrovert", label: "Being around people", desc: "Love the energy" },
    ],
  },
  {
    key: "groupSizePref",
    title: "Ideal group size?",
    options: [
      { value: "small", label: "Intimate (2-4 people)", desc: "Close connections" },
      { value: "medium", label: "Mid-sized (5-8 people)", desc: "Balanced vibe" },
      { value: "large", label: "Big group (9+ people)", desc: "High energy" },
    ],
  },
  {
    key: "activityIntensity",
    title: "Preferred activity intensity?",
    options: [
      { value: "chill", label: "Chill", desc: "Coffee, board games, walks" },
      { value: "moderate", label: "Moderate", desc: "Hikes, exploring, sports" },
      { value: "active", label: "High energy", desc: "Intense workouts, dancing" },
    ],
  },
  {
    key: "conversationStyle",
    title: "Your conversation style?",
    options: [
      { value: "deep", label: "Deep & meaningful", desc: "Life, philosophy, dreams" },
      { value: "playful", label: "Playful & witty", desc: "Banter, jokes, memes" },
      { value: "observant", label: "Observant listener", desc: "I listen more than I talk" },
    ],
  },
  {
    key: "planningStyle",
    title: "How do you plan?",
    options: [
      { value: "spontaneous", label: "Spontaneous", desc: "Last-minute plans" },
      { value: "planner", label: "Organized", desc: "I like a clear plan" },
    ],
  },
];

export default function VibeQuizScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { answers, setAnswer, completeQuiz, skipQuiz } = useVibeQuizStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const q = QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  const handleSelect = (key: string, value: string) => {
    setAnswer(key as any, value);
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    await completeQuiz(user.uid);
    setSaving(false);
    router.replace("/(tabs)/index" as any);
  };

  const handleSkip = () => {
    skipQuiz();
    router.replace("/(tabs)/index" as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.stepLabel, { color: colors.textMuted }]}>
          Question {currentStep + 1} of {QUESTIONS.length}
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>{q.title}</Text>

        <View style={styles.options}>
          {q.options.map((opt) => {
            const isSelected = answers[q.key as keyof typeof answers] === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionCard,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary + "11" : colors.bgElevated,
                  },
                ]}
                onPress={() => handleSelect(q.key, opt.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
                </View>
                {isSelected && <View style={[styles.checkCircle, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep((p) => p - 1)}>
              <Text style={{ color: colors.primary, fontWeight: "600" }}>Back</Text>
            </TouchableOpacity>
          )}
          {currentStep === QUESTIONS.length - 1 && (
            <TouchableOpacity
              style={[styles.finishBtn, { backgroundColor: colors.primary }]}
              onPress={handleFinish}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={[styles.finishText, { color: colors.textInverse }]}>Finish</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={{ color: colors.textMuted }}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressTrack: { height: 4, backgroundColor: "#E0E0E0", width: "100%" },
  progressFill: { height: "100%", borderRadius: 2 },
  content: { padding: 24, paddingBottom: 60 },
  stepLabel: { fontSize: 13, fontWeight: "600", marginBottom: 12, textTransform: "uppercase" },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 32, lineHeight: 36 },
  options: { gap: 12 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "space-between",
  },
  optionTextWrap: { flex: 1 },
  optionLabel: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  optionDesc: { fontSize: 14 },
  checkCircle: { width: 20, height: 20, borderRadius: 10 },
  footer: { marginTop: 40, gap: 16, alignItems: "center" },
  backBtn: { alignSelf: "flex-start", paddingVertical: 8 },
  finishBtn: { width: "100%", paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  finishText: { fontSize: 16, fontWeight: "700" },
  skipBtn: { paddingVertical: 8 },
});