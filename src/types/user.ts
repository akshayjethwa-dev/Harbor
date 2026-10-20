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

/**
 * A time block's local-hour range.
 * - `startHour` and `endHour` are integers 0–23 (24-hour clock).
 * - If `startHour >= endHour`, the range wraps past midnight
 *   (e.g. Night: startHour=21, endHour=6).
 */
export interface TimeBlockRange {
  startHour: number;
  endHour: number;
}

/** Per-user override of the default block ranges. */
export type TimeBlockRanges = Partial<Record<TimeBlockKey, TimeBlockRange>>;

/**
 * Availability is stored as a flat map:
 *   { "mon_morning": "free", "tue_evening": "busy", ... }
 *
 * Absence of a key = "unknown" (distinct from "busy").
 */
export type AvailabilityMap = Partial<
  Record<`${DayKey}_${TimeBlockKey}`, AvailabilityStatus>
>;

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

  // ─── Task 1: General Availability ───
  /** Recurring weekly availability. Key = `${day}_${block}`. */
  availability?: AvailabilityMap;
  /** Per-user overrides for block time ranges (Morning/Afternoon/Evening/Night). */
  timeBlockRanges?: TimeBlockRanges;
  /** IANA timezone identifier at time of save (e.g. "Asia/Kolkata"). */
  availabilityTimezone?: string;
  /** UTC offset in minutes at time of save (for DST-aware display). */
  availabilityUtcOffsetMinutes?: number;
  /** ISO timestamp of last availability update. */
  availabilityUpdatedAt?: Date;

  upiId?: string; // e.g., user@okhdfcbank

  presenceEnabled?: boolean;

  reminderSettings?: {
    taskReminders?: boolean;   // 24h / due date pushes
    overdueDigest?: boolean;   // Daily organizer digest
    dndStart?: number;         // 0-23 (e.g., 22 for 10 PM)
    dndEnd?: number;           // 0-23 (e.g., 7 for 7 AM)
  };
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