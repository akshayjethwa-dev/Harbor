// src/store/planCreateStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlanDraft } from '../types/plan';

interface PlanCreateState {
  draft: PlanDraft;
  currentStep: number;
  lastSavedAt: number | null;
  hasHydrated: boolean;

  // Actions
  updateDraft: (partial: Partial<PlanDraft>) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const TOTAL_PLAN_STEPS = 8;

const initialDraft: PlanDraft = {
  activity: null,
  activityCustom: '',
  title: '',
  description: '',
  startDate: null,
  startTime: '',
  city: '',
  locationName: '',
  locationAddress: '', // ✅ FIXED: Added missing property
  latitude: null,      // ✅ FIXED: Added missing property
  longitude: null,     // ✅ FIXED: Added missing property
  capacity: 4,
  approvalMode: 'auto',
  visibility: 'public',
  requirements: {
    verifiedOnly: false,
    womenOnly: false,
    minGuestScore: null,
    skillLevel: null,
  },
  costTotal: 0,
  durationMinutes: 120,
};

export const usePlanCreateStore = create<PlanCreateState>()(
  persist(
    (set, get) => ({
      draft: initialDraft,
      currentStep: 0,
      lastSavedAt: null,
      hasHydrated: false,

      updateDraft: (partial) =>
        set((state) => ({
          draft: { ...state.draft, ...partial },
          lastSavedAt: Date.now(), // Record save time on every update
        })),

      setStep: (step) => set({ currentStep: step, lastSavedAt: Date.now() }),
      
      nextStep: () => set((state) => ({ 
        currentStep: Math.min(state.currentStep + 1, TOTAL_PLAN_STEPS - 1),
        lastSavedAt: Date.now() 
      })),
      
      prevStep: () => set((state) => ({ 
        currentStep: Math.max(state.currentStep - 1, 0),
        lastSavedAt: Date.now() 
      })),

      reset: () =>
        set({
          draft: initialDraft,
          currentStep: 0,
          lastSavedAt: null,
        }),

      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'plan-create-draft',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        draft: state.draft,
        currentStep: state.currentStep,
        lastSavedAt: state.lastSavedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);