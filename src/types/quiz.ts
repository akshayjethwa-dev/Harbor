// src/types/quiz.ts
export type SocialEnergy = "introvert" | "ambivert" | "extrovert";
export type GroupSizePref = "small" | "medium" | "large";
export type ActivityIntensity = "chill" | "moderate" | "active";
export type ConversationStyle = "deep" | "playful" | "observant";
export type PlanningStyle = "spontaneous" | "planner";

export interface VibeQuizAnswers {
  socialEnergy?: SocialEnergy;
  groupSizePref?: GroupSizePref;
  activityIntensity?: ActivityIntensity;
  conversationStyle?: ConversationStyle;
  planningStyle?: PlanningStyle;
  completedAt?: number; // Timestamp
}