import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlanDraft, EMPTY_PLAN_DRAFT } from "../types/plan";

interface PlanCreateStore {
  currentStep: number;
  draft: PlanDraft;
  lastSavedAt: number | null;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateDraft: (partial: Partial<PlanDraft>) => void;
  reset: () => void;
}

export const TOTAL_PLAN_STEPS = 8;

// Serialize Date objects to ISO strings for AsyncStorage
function serializeDraft(d: PlanDraft): any {
  return {
    ...d,
    startDate: d.startDate ? d.startDate.toISOString() : null,
  };
}

function deserializeDraft(raw: any): PlanDraft {
  if (!raw) return { ...EMPTY_PLAN_DRAFT };
  return {
    ...EMPTY_PLAN_DRAFT,
    ...raw,
    startDate: raw.startDate ? new Date(raw.startDate) : null,
  };
}

export const usePlanCreateStore = create<PlanCreateStore>()(
  persist(
    (set) => ({
      currentStep: 0,
      draft: { ...EMPTY_PLAN_DRAFT },
      lastSavedAt: null,
      setStep: (step) => set({ currentStep: step, lastSavedAt: Date.now() }),
      nextStep: () =>
        set((s) => ({
          currentStep: s.currentStep + 1,
          lastSavedAt: Date.now(),
        })),
      prevStep: () =>
        set((s) => ({
          currentStep: Math.max(0, s.currentStep - 1),
          lastSavedAt: Date.now(),
        })),
      updateDraft: (partial) =>
        set((s) => ({
          draft: { ...s.draft, ...partial },
          lastSavedAt: Date.now(),
        })),
      reset: () =>
        set({
          currentStep: 0,
          draft: { ...EMPTY_PLAN_DRAFT },
          lastSavedAt: null,
        }),
    }),
    {
      name: "planCreateDraft",
      storage: createJSONStorage(() => AsyncStorage),
      // Serialize Dates
      partialize: (state) => ({
        currentStep: state.currentStep,
        draft: serializeDraft(state.draft),
        lastSavedAt: state.lastSavedAt,
      }),
      // Deserialize on rehydrate
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.draft = deserializeDraft((state as any).draft);
        }
      },
    }
  )
);