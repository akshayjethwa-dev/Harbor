// src/types/user.ts

// ─── Availability types (Task 1) ───
export type AvailabilityStatus = "free" | "busy" | "maybe";

export type DayKey =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export type TimeBlockKey = "morning" | "afternoon" | "evening" | "night";

export interface TimeBlockRange {
  startHour: number;
  endHour: number;
}

export type TimeBlockRanges = Partial<Record<TimeBlockKey, TimeBlockRange>>;

export type AvailabilityMap = Partial<
  Record<`${DayKey}_${TimeBlockKey}`, AvailabilityStatus>
>;

// ─── Generic Profile Types ───
export type SocialVibe = "introvert" | "extrovert" | "ambivert" | "life_of_the_party" | "chill";
export type UserIntent = "friends" | "networking" | "dating" | "hobbies" | "coworking";
export type GroupRole = "planner" | "follower" | "photographer" | "funny" | "budget_boss";

// Renamed from GarbaCrewUser to AppUser for generic branding
export interface AppUser {
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
  
  // ─── Generic Compatibility Fields ───
  intent?: UserIntent[];
  socialVibe?: SocialVibe;
  groupRole?: GroupRole;
  interests?: string[]; 
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

  // ─── Task 1: General Availability ───
  availability?: AvailabilityMap;
  timeBlockRanges?: TimeBlockRanges;
  availabilityTimezone?: string;
  availabilityUtcOffsetMinutes?: number;
  availabilityUpdatedAt?: Date;

  upiId?: string;

  presenceEnabled?: boolean;

  reminderSettings?: {
    taskReminders?: boolean;
    overdueDigest?: boolean;
    dndStart?: number;
    dndEnd?: number;
  };

  analyticsOptOut?: boolean;

  acceptedPrivacyVersion?: string;
  acceptedTermsVersion?: string;
  hasParentalConsent?: boolean;
  lastConsentDate?: Date;

  legalHold?: boolean; 
  hasSeenOnboarding?: boolean;
  badges?: string[]; 
  showOnLeaderboard?: boolean;

  currentStreak?: number;
  bestStreak?: number;
  streakFreezes?: number;
  lastStreakWeek?: string;

  subscriptionTier?: "free" | "plus" | "pro" | "host";
}

// Kept as an alias to prevent breaking your other files that still import GarbaCrewUser
export type GarbaCrewUser = AppUser;

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
  
  // Generic fields
  socialVibe: SocialVibe | null;
  intent: UserIntent[];
  groupRole: GroupRole | null;
  interests: string[];
  
  groupSizePreference: number | null;
  lookingFor: "friend" | "partner" | "crew" | "all" | null;
  bio: string;
}