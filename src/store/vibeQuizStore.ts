// src/store/vibeQuizStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { VibeQuizAnswers } from "../types/quiz";

interface VibeQuizState {
  answers: VibeQuizAnswers;
  isCompleted: boolean;
  isSkipped: boolean;
  setAnswer: (key: keyof VibeQuizAnswers, value: any) => void;
  completeQuiz: (userId: string) => Promise<void>;
  skipQuiz: () => void;
  resetQuiz: () => void;
}

export const useVibeQuizStore = create<VibeQuizState>()(
  persist(
    (set, get) => ({
      answers: {},
      isCompleted: false,
      isSkipped: false,

      setAnswer: (key, value) =>
        set((state) => ({
          answers: { ...state.answers, [key]: value },
        })),

      completeQuiz: async (userId: string) => {
        const answers = get().answers;
        const payload = {
          ...answers,
          completedAt: Date.now(),
        };

        // Save to Firestore
        try {
          await updateDoc(doc(db, "users", userId), {
            vibeQuizAnswers: payload,
          });
        } catch (e) {
          console.warn("Failed to sync quiz to Firestore:", e);
        }

        set({ isCompleted: true, isSkipped: false });
      },

      skipQuiz: () => set({ isSkipped: true }),

      resetQuiz: () => set({ answers: {}, isCompleted: false, isSkipped: false }),
    }),
    {
      name: "vibe-quiz-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);