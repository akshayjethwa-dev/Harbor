// src/services/recommendationService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchPlans } from "./planService";
import { getPartnerCandidates } from "./partnerService";
import { DEFAULT_PARTNER_FILTERS, PartnerCandidate, PartnerFilters } from "../types/partner";
import { Plan } from "../types/plan";
import { GarbaCrewUser } from "../types/user";
import { VibeQuizAnswers } from "../types/quiz";

export type PickType = "plan" | "partner";

export interface Recommendation {
  id: string; // planId or uid
  type: PickType;
  data: Plan | PartnerCandidate;
  score: number;
  reason: string;
  signals: string[];
}

const DISMISS_KEY_PREFIX = "dismissed_picks_";

// ─────────────────────────────────────────────────────────
// Scoring Helpers
// ─────────────────────────────────────────────────────────
function scorePlan(plan: Plan, user: GarbaCrewUser): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];
  const quiz = user.vibeQuizAnswers as VibeQuizAnswers | undefined;

  // 1. Shared Activities
  const userActivities = user.activities || [];
  const planActivity = plan.activity;
  if (userActivities.includes(planActivity)) {
    score += 5;
    signals.push(`You both like ${planActivity}`);
  }

  // 2. City Proximity
  if (user.city && plan.city === user.city) {
    score += 3;
    signals.push(`In your city (${plan.city})`);
  }

  // 3. Host Score
  const hostScore = plan.hostScore ?? 50;
  if (hostScore > 70) {
    score += 2;
    signals.push(`High host rating (${hostScore})`);
  } else if (hostScore > 50) {
    score += 1;
    signals.push(`Good host rating (${hostScore})`);
  }

  // 4. Past Attendance
  if ((user.plansJoined ?? 0) > 0) {
    signals.push("You've attended similar plans before");
  }

  // 5. Verified Host
  if (plan.hostVerified) {
    score += 1;
    signals.push("Verified host");
  }

  // 6. Vibe Quiz - Activity Intensity
  if (quiz?.activityIntensity) {
    const intensityMap: Record<string, string[]> = {
      chill: ["chill", "coffee", "board games", "movie", "food"],
      moderate: ["hike", "trek", "explore", "sports"],
      active: ["dance", "workout", "run", "garba", "cricket"],
    };
    const preferred = intensityMap[quiz.activityIntensity] || [];
    if (preferred.includes(plan.activity)) {
      score += 3;
      signals.push(`Matches your ${quiz.activityIntensity} vibe`);
    }
  }

  // 7. Vibe Quiz - Planning Style
  if (quiz?.planningStyle === "planner") {
    if (plan.locationName && plan.locationName !== "TBD") {
      score += 1;
      signals.push("Well-defined plan for a planner");
    }
  } else if (quiz?.planningStyle === "spontaneous") {
    const startTime = plan.startTime?.toMillis ? plan.startTime.toMillis() : new Date(plan.startTime).getTime();
    const hoursUntil = (startTime - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil > 0 && hoursUntil < 48) {
      score += 2;
      signals.push("Happening soon for spontaneous you");
    }
  }

  return { score, signals };
}

function scorePartner(partner: PartnerCandidate, user: GarbaCrewUser): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];
  const quiz = user.vibeQuizAnswers as VibeQuizAnswers | undefined;

  // 1. Shared Activities
  const shared = partner.sharedActivities || [];
  if (shared.length > 0) {
    score += shared.length * 2;
    signals.push(`Shared interests: ${shared.slice(0, 2).join(", ")}`);
  }

  // 2. City Proximity
  if (user.city && partner.city === user.city) {
    score += 3;
    signals.push(`Lives in ${partner.city}`);
  }

  // 3. Trust Balance
  const trust = partner.trustBalance ?? 50;
  if (trust > 70) {
    score += 2;
    signals.push(`High trust score (${trust})`);
  } else if (trust > 50) {
    score += 1;
    signals.push(`Trust score ${trust}`);
  }

  // 4. Vibe Quiz - Social Energy
  if (quiz?.socialEnergy) {
    if (quiz.socialEnergy === "introvert" && partner.partnerVibe === "chill") {
      score += 3;
      signals.push("Matches your introvert energy");
    } else if (quiz.socialEnergy === "extrovert" && partner.partnerVibe === "life_of_the_party") {
      score += 3;
      signals.push("Matches your extrovert energy");
    } else {
      score += 1;
      signals.push(`Matches your ${quiz.socialEnergy} energy`);
    }
  }

  // 5. Vibe Quiz - Conversation Style
  if (quiz?.conversationStyle) {
    if (partner.bio?.toLowerCase().includes("deep") && quiz.conversationStyle === "deep") {
      score += 2;
      signals.push("Aligned conversation style (deep chats)");
    } else {
      score += 1;
      signals.push("Aligned conversation style");
    }
  }

  return { score, signals };
}

function generateReason(signals: string[]): string {
  if (signals.length === 0) return "Recommended for you";
  return `Because you like ${signals[0]}`;
}

// ─────────────────────────────────────────────────────────
// Fetch Recommendations
// ─────────────────────────────────────────────────────────
export async function fetchDailyRecommendations(
  user: GarbaCrewUser,
  dismissedIds: string[] = []
): Promise<{ plans: Recommendation[]; partners: Recommendation[] }> {
  // 1. Fetch candidate pool
  const city = user.city || "";
  const plansResult = await fetchPlans({ city, maxResults: 20 });
  const partnerFilters: PartnerFilters = { ...DEFAULT_PARTNER_FILTERS, city };
  const partnerCandidates = await getPartnerCandidates(user, partnerFilters, 20);

  // 2. Score and filter plans (Typed as Recommendation to fix literal string error)
  const scoredPlans: Recommendation[] = plansResult.plans
    .map((plan): Recommendation => {
      const { score, signals } = scorePlan(plan, user);
      return {
        id: plan.id,
        type: "plan", // TypeScript now knows this is valid PickType
        data: plan,
        score,
        reason: generateReason(signals),
        signals,
      };
    })
    .filter((rec) => !dismissedIds.includes(rec.id))
    .sort((a, b) => b.score - a.score);

  // 3. Score and filter partners (Typed as Recommendation)
  const scoredPartners: Recommendation[] = partnerCandidates
    .map((partner): Recommendation => {
      const { score, signals } = scorePartner(partner, user);
      return {
        id: partner.uid,
        type: "partner", // TypeScript now knows this is valid PickType
        data: partner,
        score,
        reason: generateReason(signals),
        signals,
      };
    })
    .filter((rec) => !dismissedIds.includes(rec.id))
    .sort((a, b) => b.score - a.score);

  // 4. Take top 3 of each
  return {
    plans: scoredPlans.slice(0, 3),
    partners: scoredPartners.slice(0, 3),
  };
}

// ─────────────────────────────────────────────────────────
// Dismissal Persistence
// ─────────────────────────────────────────────────────────
function getDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export async function getDismissedIds(): Promise<string[]> {
  const dateKey = getDateKey();
  const key = `${DISMISS_KEY_PREFIX}${dateKey}`;
  const stored = await AsyncStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

export async function dismissPick(pickId: string): Promise<void> {
  const dateKey = getDateKey();
  const key = `${DISMISS_KEY_PREFIX}${dateKey}`;
  const existing = await getDismissedIds();
  if (!existing.includes(pickId)) {
    const updated = [...existing, pickId];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  }
}