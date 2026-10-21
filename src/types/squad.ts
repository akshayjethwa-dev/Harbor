import { Timestamp } from "firebase/firestore";
import { PlanActivity } from "./plan";

export type SquadRole = "admin" | "co_admin" | "member";

export interface SquadMember {
  uid: string;
  name: string;
  photoUrl: string | null;
  role: SquadRole;
  guestScore: number;
  joinedAt: Timestamp | any;
}

export interface SquadRecurring {
  enabled: boolean;
  dayOfWeek: number | null; // 0 = Sunday, 6 = Saturday
  time: string; // "18:30"
}

export interface Squad {
  id: string;
  name: string;
  description: string;

  activity: PlanActivity;
  activityCustom?: string;
  coverImageUrl: string | null;

  // Admin
  adminUid: string;
  adminName: string;
  adminPhotoUrl: string | null;

  // Members
  memberUids: string[];
  memberDetails: SquadMember[];
  coAdminUids: string[];

  // Recurring pattern
  recurring: SquadRecurring | null;

  city: string;
  chatId: string;

  // Lifecycle
  isActive: boolean;
  isArchived: boolean;
  archivedReason?: string;
  archivedAt?: Timestamp | any;

  lastActivityAt: Timestamp | any;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;

  plansGeneratedCount: number;
  customBranding?: {
    logoUrl?: string;
    primaryColor?: string;
    customUrl?: string;
  };
}

export interface SquadDraft {
  name: string;
  description: string;
  activity: PlanActivity | null;
  activityCustom: string;
  city: string;
  coverImageUrl: string | null;
  recurringEnabled: boolean;
  recurringDayOfWeek: number | null;
  recurringTime: string;
}

export const EMPTY_SQUAD_DRAFT: SquadDraft = {
  name: "",
  description: "",
  activity: null,
  activityCustom: "",
  city: "",
  coverImageUrl: null,
  recurringEnabled: false,
  recurringDayOfWeek: null,
  recurringTime: "",
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface ActiveMemberStat {
  uid: string;
  name: string;
  photoUrl: string | null;
  planCount: number;
}

export interface SquadInsights {
  totalPlans: number;
  completedPlans: number;
  cancelledPlans: number;
  totalSpent: number;
  perPersonSpend: number;
  mostActiveMembers: ActiveMemberStat[];
  attendanceRate: number; // percentage
  currentMemberCount: number;
}