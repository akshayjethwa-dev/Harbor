// app/plan/create.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  BackHandler,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  usePlanCreateStore,
  TOTAL_PLAN_STEPS,
} from "../../src/store/planCreateStore";
import { useAuth } from "../../src/context/AuthContext";
import { createPlan } from "../../src/services/planService";
import { checkTrustAccess } from "../../src/services/accessControl";
import {
  getTemplate,
  markTemplateUsed,
  templateToPlanDraftPartial,
} from "../../src/services/templateService";

import Step1Activity from "../../src/components/plan-create/Step1Activity";
import Step2Details from "../../src/components/plan-create/Step2Details";
import Step3Location from "../../src/components/plan-create/Step3Location";
import Step4Capacity from "../../src/components/plan-create/Step4Capacity";
import Step5Requirements from "../../src/components/plan-create/Step5Requirements";
import Step6Approval from "../../src/components/plan-create/Step6Approval";
import Step7Visibility from "../../src/components/plan-create/Step7Visibility";
import Step8Review from "../../src/components/plan-create/Step8Review";
import AvailabilityPrompt from "../../src/components/plan-create/AvailabilityPrompt";
import ResumeDraftModal from "../../src/components/plan/ResumeDraftModal";

export default function CreatePlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { templateId, preset } = useLocalSearchParams<{ templateId?: string; preset?: string }>();

  const { currentStep, nextStep, prevStep, draft, reset, updateDraft } =
    usePlanCreateStore();
  
  const lastSavedAt = usePlanCreateStore((s) => s.lastSavedAt);
  const hasHydrated = usePlanCreateStore((s) => s.hasHydrated);
  const [saving, setSaving] = useState(false);
  
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Inline validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const access = checkTrustAccess(user, "create_plan");

  const hasAvailability =
    !!user?.availability && Object.keys(user.availability).length > 0;

  // ─────────────────────────────────────────────────────────
  // AppState Listener
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        usePlanCreateStore.setState({ lastSavedAt: Date.now() });
      }
    });
    return () => subscription.remove();
  }, []);

  // ─────────────────────────────────────────────────────────
  // Template & Preset loaders
  // ─────────────────────────────────────────────────────────
  const templateLoadedRef = useRef(false);
  useEffect(() => {
    if (!templateId || templateLoadedRef.current) return;
    templateLoadedRef.current = true;
    (async () => {
      try {
        const template = await getTemplate(templateId);
        if (!template) return;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const partial = templateToPlanDraftPartial(template, tomorrow, "18:30");
        updateDraft(partial);
        await markTemplateUsed(templateId);
      } catch (e: any) {
        console.warn("Template load failed:", e);
      }
    })();
  }, [templateId, updateDraft]);

  const presetLoadedRef = useRef(false);
  useEffect(() => {
    if (preset === "first_plan" && !presetLoadedRef.current && user) {
      presetLoadedRef.current = true;
      reset();
      updateDraft({
        activity: "food",
        title: "Chai & Snacks Meetup",
        description: "A quick catch-up to break the ice!",
        startDate: new Date(Date.now() + 86400000),
        startTime: "17:00",
        durationMinutes: 120,
        locationName: "Local Cafe",
        city: user.city || "Mumbai",
        capacity: 4,
        costTotal: 0,
        approvalMode: "auto",
        visibility: "public",
      });
      usePlanCreateStore.setState({ currentStep: TOTAL_PLAN_STEPS - 1 });
    }
  }, [preset, user, updateDraft, reset]);

  // ─────────────────────────────────────────────────────────
  // Draft restore prompt logic
  // ─────────────────────────────────────────────────────────
  const promptedRef = useRef(false);
  useEffect(() => {
    if (!hasHydrated) return;
    if (promptedRef.current) return;
    if (templateId || preset) return; 
    if (!lastSavedAt) return;
    
    const hoursAgo = (Date.now() - lastSavedAt) / (1000 * 60 * 60);
    if (hoursAgo > 24) {
      reset();
      return;
    }

    if (currentStep === 0 && !draft.activity) return;

    promptedRef.current = true;
    setShowResumeModal(true);
  }, [hasHydrated, lastSavedAt, currentStep, draft.activity, reset, templateId, preset]);

  // ─────────────────────────────────────────────────────────
  // Exit flow
  // ─────────────────────────────────────────────────────────
  const performExit = useCallback(() => {
    reset();
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/crews" as any);
      }
    } catch {
      router.replace("/(tabs)/crews" as any);
    }
  }, [reset, router]);

  const handleClose = useCallback(() => {
    if (Platform.OS === "web") {
      // @ts-ignore
      const confirmed = window.confirm("Discard this Plan?\n\nYour progress will be lost.");
      if (confirmed) performExit();
      return;
    }
    Alert.alert(
      "Discard Plan?",
      "Your progress will be lost.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: performExit },
      ],
      { cancelable: true }
    );
  }, [performExit]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [handleClose]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const hasProgress = !!draft.activity || !!draft.title?.trim() || !!draft.startTime || currentStep > 0;
    if (!hasProgress) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    // @ts-ignore
    window.addEventListener("beforeunload", handler);
    return () => {
      // @ts-ignore
      window.removeEventListener("beforeunload", handler);
    };
  }, [draft, currentStep]);

  if (!access.allowed) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedEmoji}>🚫</Text>
          <Text style={styles.deniedTitle}>Can't create a Plan right now</Text>
          <Text style={styles.deniedText}>{access.reason}</Text>
          <TouchableOpacity
            style={styles.deniedButton}
            onPress={() => router.replace("/(tabs)/crews" as any)}
          >
            <Text style={styles.deniedButtonText}>Go back to Discover</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const steps = [
    <Step1Activity key={0} errors={validationErrors} />,
    <Step2Details key={1} errors={validationErrors} />,
    <Step3Location key={2} errors={validationErrors} />,
    <Step4Capacity key={3} errors={validationErrors} />,
    <Step5Requirements key={4} />,
    <Step6Approval key={5} />,
    <Step7Visibility key={6} />,
    <Step8Review key={7} />,
  ];

  const validateStep = (): boolean => {
    const errors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Step 1
        if (!draft.activity) {
          errors.activity = "Activity is required. Select what you'll be doing.";
        }
        if (draft.activity === "custom" && !draft.activityCustom.trim()) {
          errors.activityCustom = "Custom activity is required. Describe what you're planning.";
        }
        break;

      case 1: // Step 2
        if (!draft.title.trim()) {
          errors.title = "Title is required. Give your Plan a short, catchy title.";
        }
        if (!draft.startDate) {
          errors.startDate = "Date is required. Select when your Plan will happen.";
        }
        if (!/^\d{2}:\d{2}$/.test(draft.startTime)) {
          errors.startTime = "Time is required. Select a valid start time (HH:MM).";
        } else if (draft.startDate) {
          const [hh, mm] = draft.startTime.split(":").map(Number);
          const start = new Date(draft.startDate);
          start.setHours(hh, mm, 0, 0);
          if (start.getTime() <= Date.now()) {
            errors.startTime = "Start time must be in the future. Pick a later date or time.";
          }
        }
        break;

      case 2: // Step 3
        if (!draft.city) {
          errors.city = "City is required. Select or type your city.";
        }
        if (!draft.locationName.trim()) {
          errors.locationName = "Venue is required. Enter the venue or meeting point.";
        }
        break;

      case 3: // Step 4
        if (draft.costTotal > 0 && draft.capacity === 0) {
          errors.capacity = "Capacity must be at least 2 for paid Plans. Increase the number of attendees.";
        }
        break;

      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    setValidationErrors({}); // Clear errors on success
    if (currentStep < TOTAL_PLAN_STEPS - 1) {
      nextStep();
      return;
    }
    await submitPlan();
  };

  const handleBack = () => {
    setValidationErrors({}); // Clear errors when going back
    prevStep();
  };

  const submitPlan = async () => {
    if (!user) {
      Alert.alert("Error", "You must be signed in.");
      return;
    }

    setSaving(true);
    try {
      const planId = await createPlan(user, draft);
      reset();

      const targetPath = `/plan/${planId}`;
      await new Promise((r) => setTimeout(r, 100));

      try {
        router.replace(targetPath as any);
      } catch (navErr) {
        try {
          router.push(targetPath as any);
        } catch (pushErr) {
          if (Platform.OS === "web") {
            // @ts-ignore
            window.location.href = targetPath;
          } else {
            try {
              // @ts-ignore
              if (router.dismiss) router.dismiss();
            } catch {}
            setTimeout(() => {
              try {
                router.push(targetPath as any);
              } catch (finalErr) {
                Alert.alert("Plan created!", `Plan ID: ${planId}\n\nPlease open it from the Discover tab.`);
              }
            }, 200);
          }
        }
      }
    } catch (e: any) {
      Alert.alert("Could not create Plan", e.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const progressPct = ((currentStep + 1) / TOTAL_PLAN_STEPS) * 100;

  if (!hasHydrated) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>

          <Text style={styles.stepLabel}>
            {currentStep + 1}/{TOTAL_PLAN_STEPS}
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 16 }} keyboardShouldPersistTaps="handled">
          <AvailabilityPrompt hasAvailability={hasAvailability} />
          {steps[currentStep]}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={saving}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, currentStep === 0 && { flex: 1, marginLeft: 0 }, saving && { opacity: 0.6 }]}
            onPress={handleNext}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.nextText}>
                {currentStep === TOTAL_PLAN_STEPS - 1 ? "Post Plan" : "Next"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ResumeDraftModal
        visible={showResumeModal}
        step={currentStep + 1}
        onResume={() => setShowResumeModal(false)}
        onStartFresh={() => {
          reset();
          setShowResumeModal(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: { fontSize: 18, color: "#333", fontWeight: "600" },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#E91E63" },
  stepLabel: { fontSize: 13, color: "#999", fontWeight: "600" },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFF",
  },
  backBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  backText: { fontSize: 16, fontWeight: "600", color: "#333" },
  nextBtn: {
    flex: 2,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center",
  },
  nextText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  deniedContainer: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  deniedEmoji: { fontSize: 64, marginBottom: 16 },
  deniedTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
  },
  deniedText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  deniedButton: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: "#E91E63",
    borderRadius: 12,
  },
  deniedButtonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
});