import { Timestamp } from "firebase/firestore";

// ─── Enums ───
export type PlanActivity =
  | "cricket"
  | "trek"
  | "garba"
  | "movie"
  | "food"
  | "party"
  | "custom";

export type PlanStatus =
  | "open"
  | "full"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type ApprovalMode =
  | "auto"
  | "manual"
  | "paid_auto"
  | "paid_manual";

export type PlanVisibility = "public" | "squad_only" | "private";

export type SkillLevel = "beginner" | "intermediate" | "advanced";

// ─── Task 2: Date Polls ───
export type PlanDateStatus = "pending" | "confirmed";

// ─── Sub-objects ───
export interface PlanRequirements {
  verifiedOnly: boolean;
  womenOnly: boolean;
  minGuestScore: number | null;
  skillLevel: SkillLevel | null;
}

export interface PlanParticipant {
  uid: string;
  name: string;
  photoUrl: string | null;
  guestScore: number;
  joinedAt: Timestamp | any;
  approved: boolean;
}

export interface PlanJoinRequest {
  uid: string;
  name: string;
  photoUrl: string | null;
  guestScore: number;
  isVerified: boolean;
  age?: number;
  bio?: string;
  message: string;
  requestedAt: Timestamp | any;
  autoDeclineAt: Timestamp | any;
}

export interface CheckInRecord {
  at: Timestamp | any;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
}

// ─── Main Plan document ───
export interface Plan {
  id: string;

  hostUid: string;
  hostName: string;
  hostPhotoUrl: string | null;
  hostScore: number;
  hostVerified: boolean;

  activity: PlanActivity;
  activityCustom?: string;
  title: string;
  titleLower?: string;
  description: string;

  startTime: Timestamp | any;
  endTime: Timestamp | any;
  durationMinutes: number;

  locationName: string;
  locationAddress: string;
  city: string;
  latitude: number | null;
  longitude: number | null;

  capacity: number;
  costTotal: number;
  costPerPerson: number;

  requirements: PlanRequirements;
  approvalMode: ApprovalMode;
  visibility: PlanVisibility;

  participants: string[];
  participantDetails: PlanParticipant[];
  spotsFilled: number;

  pendingRequests: PlanJoinRequest[];
  waitlist: string[];

  chatId: string;
  lastMessage: string | null;
  lastMessageAt: Timestamp | any | null;

  status: PlanStatus;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;

  // ─── Feature 8: Check-in ───
  checkIns?: Record<string, CheckInRecord>;
  noShowUids?: string[];
  noShowMarkedAt?: Timestamp | any;

  // ─── Feature 9: Reminders ───
  reminded24h?: boolean;
  reminded2h?: boolean;

  // ─── Feature: Disputes ───
  hasOpenDispute?: boolean;
  disputeId?: string;

  // ─── Feature: Completed ───
  completedAt?: Timestamp | any;

  // ─── Task 2: Date Polls ───
  /**
   * "pending" while a date poll is open or no date has been confirmed.
   * "confirmed" once the organizer locks in a slot (or the plan was
   * created with a fixed date and never polled).
   *
   * Absent on legacy plans → treat as "confirmed" (they have a real
   * startTime).
   */
  dateStatus?: PlanDateStatus;
  /**
   * Id of the currently-active date poll, or null/undefined when none.
   * Cleared automatically by `confirmSlot`, `closePoll`, and the
   * `expireStalePolls` Cloud Function.
   */
  pendingDatePollId?: string | null;

  // ─── Task 36: No-Show Tracking ───
  attendanceMarked?: boolean;
  excusedUids?: string[];

  hostSubscriptionTier?: string;
  isHostTier?: boolean;
  requiresWaiver?: boolean;
}

// ─── Chat ───
export type ChatMessageType = "text" | "image" | "system" | "voice";

export interface ChatMessage {
  id: string;
  fromUid: string;
  fromName: string;
  fromPhotoUrl: string | null;
  type: ChatMessageType;
  text: string;
  imageUrl: string | null;
  voiceUrl?: string | null;
  voiceDurationMs?: number | null;
  createdAt: Timestamp | any;
}

export interface ChatTypingEntry {
  uid: string;
  name: string;
  at: Timestamp | any;
}

export interface ChatReadEntry {
  uid: string;
  lastReadAt: Timestamp | any;
}

// ─── Draft type ───
export interface PlanDraft {
  activity: PlanActivity | null;
  activityCustom: string;
  title: string;
  description: string;
  startDate: Date | null;
  startTime: string;
  durationMinutes: number;
  locationName: string;
  locationAddress: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  costTotal: number;
  requirements: PlanRequirements;
  approvalMode: ApprovalMode;
  visibility: PlanVisibility;
  requiresWaiver?: boolean;
}

export const EMPTY_PLAN_DRAFT: PlanDraft = {
  activity: null,
  activityCustom: "",
  title: "",
  description: "",
  startDate: null,
  startTime: "",
  durationMinutes: 120,
  locationName: "",
  locationAddress: "",
  city: "",
  latitude: null,
  longitude: null,
  capacity: 6,
  costTotal: 0,
  requirements: {
    verifiedOnly: false,
    womenOnly: false,
    minGuestScore: null,
    skillLevel: null,
  },
  approvalMode: "auto",
  visibility: "public",
};

export function getApprovalMode(isPaid: boolean, isManual: boolean): ApprovalMode {
  if (isPaid && isManual) return "paid_manual";
  if (isPaid) return "paid_auto";
  if (isManual) return "manual";
  return "auto";
}

export function isPaidMode(mode: ApprovalMode): boolean {
  return mode === "paid_auto" || mode === "paid_manual";
}

export function isManualMode(mode: ApprovalMode): boolean {
  return mode === "manual" || mode === "paid_manual";
}

export const REQUEST_AUTO_DECLINE_HOURS = 48;