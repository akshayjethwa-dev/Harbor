// src/types/partner.ts
import { Timestamp } from "firebase/firestore";

export type SwipeDirection = "left" | "right" | "super";
export type MatchStatus = "pending_first_message" | "active" | "expired";
export type PartnerGender = "male" | "female" | "other" | "any";

export interface PartnerCandidate {
  uid: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  photoUrl: string | null;
  city: string;
  bio?: string;
  activities?: string[];
  vibeScore?: number;
  partnerVibe?: string;
  isVerified: boolean;
  distanceKm?: number;
  mutualActivities?: string[];
  trustBalance?: number;
  sharedActivities?: string[];
}

export interface PartnerSwipe {
  fromUid: string;
  toUid: string;
  direction: SwipeDirection;
  createdAt: Timestamp | any;
}

export interface PartnerSayHi {
  fromUid: string;
  toUid: string;
  createdAt: Timestamp | any;
}

export interface PartnerMatch {
  id: string;
  users: [string, string];
  otherUid: string;
  otherName: string;
  otherPhotoUrl: string | null;
  otherGender: "male" | "female" | "other";
  matchedAt: Timestamp | any;
  lastMessageAt: Timestamp | any | null;
  lastMessage: string | null;
  firstMessageBy: string | null;
  firstMessageDeadline: Timestamp | any;
  status: MatchStatus;
  superLike: boolean;
}

export interface PartnerFilters {
  ageMin: number;
  ageMax: number;
  gender: PartnerGender;
  city: string | null;
  activities: string[];
  vibe: string | null;
  verifiedOnly: boolean;
}

export const DEFAULT_PARTNER_FILTERS: PartnerFilters = {
  ageMin: 18,
  ageMax: 45,
  gender: "any",
  city: null,
  activities: [],
  vibe: null,
  verifiedOnly: false,
};

export const MATCH_FIRST_MESSAGE_HOURS = 24;