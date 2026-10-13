export interface GarbaCrewUser {
  // ─── Identity (Epic 1) ───
  uid: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: Date;
  profileComplete: boolean;

  // ─── Profile fields (Epic 1) ───
  name?: string;
  nameLower?: string;
  age?: number;
  gender?: "male" | "female" | "other";
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  languages?: string[];
  activities?: string[];
  danceSkill?: "beginner" | "intermediate" | "advanced" | "expert";
  preferredStyles?: string[];
  yearsAttendingNavratri?: number;
  groupSizePreference?: number;
  lookingFor?: "friend" | "partner" | "crew" | "all";
  vibeScore?: number;
  favoriteActivitySong?: string;
  postActivityRitual?: string;
  bio?: string;

  // ─── Verification (Epic 1) ───
  isVerified: boolean;
  selfieVerified: boolean;
  selfieEmbedding?: number[];
  profileScore: number;

  // ─── Epic 2: Dual Score & Trust System ───
  hostScore: number;
  guestScore: number;
  trustBalance: number;
  escrowBalance: number;
  streak: number;
  plansHosted: number;
  plansJoined: number;
  completedPlans: number;
  plansCreatedCount?: number;
  noShowCount?: number;

  // ─── Epic 6: Partner Discovery ───
  lookingForPartner?: boolean;
  partnerVibe?: string;

  // ─── Epic 2: Moderation ───
  lastRatedAt?: Date;
  suspendedUntil?: Date;
  isBanned?: boolean;

  // ─── Feature 10: Referral ───
  referralCode?: string;
  referralCount?: number;
  referredBy?: string;
  referredAt?: Date;

  // ─── Feature 15: Rate Limits ───
  plansCreatedToday?: number;
  plansCreatedThisWeek?: number;
  planDayStart?: any;
  planWeekStart?: any;

  // ─── Feature: Deletion ───
  isDeleted?: boolean;
  deletedAt?: Date;
}

export interface ProfileSetupData {
  photoUri: string | null;
  name: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  city: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
  languages: string[];
  activities: string[];
  danceSkill: "beginner" | "intermediate" | "advanced" | "expert" | null;
  preferredStyles: string[];
  yearsAttendingNavratri: number | null;
  groupSizePreference: number | null;
  lookingFor: "friend" | "partner" | "crew" | "all" | null;
  vibeScore: number;
  favoriteActivitySong: string;
  postActivityRitual: string;
  bio: string;
}