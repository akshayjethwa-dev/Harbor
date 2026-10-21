// src/types/safety.ts
import { Timestamp } from "firebase/firestore";

// ─────────────────────────────────────────────────────────
// SOS Events
// ─────────────────────────────────────────────────────────
export type SOSStatus = "active" | "cancelled" | "resolved";

export interface SOSEvent {
  id: string;
  uid: string;
  userName: string;
  userPhone: string | null;
  planId: string | null;
  squadId: string | null;
  chatId: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy?: number | null;
  isLastKnownLocation: boolean; // <-- Task 39: Fallback tracking
  status: SOSStatus;
  message?: string;
  respondedBy: string[];    
  emergencyContactsNotified: string[];  
  autoAlertSent: boolean;   // <-- Task 39: 5-minute escalation tracker
  createdAt: Timestamp | any;
  cancelledAt?: Timestamp | any;
  resolvedAt?: Timestamp | any;
  expiresAt: Timestamp | any;    
}

// ─────────────────────────────────────────────────────────
// Live Location
// ─────────────────────────────────────────────────────────
export interface LiveLocation {
  id: string;               
  uid: string;
  userName: string;
  scopeType: "plan" | "squad" | "match";
  scopeId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updatedAt: Timestamp | any;
  expiresAt: Timestamp | any;    
}

// ─────────────────────────────────────────────────────────
// Emergency Contacts
// ─────────────────────────────────────────────────────────
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
}

// ─────────────────────────────────────────────────────────
// Block User
// ─────────────────────────────────────────────────────────
export interface Block {
  id: string;              
  blockerUid: string;
  blockedUid: string;
  blockedName: string;
  blockedPhotoUrl: string | null;
  reason?: string;
  createdAt: Timestamp | any;
}

// ─────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────
export type ReportTargetType = "user" | "plan" | "squad" | "message";
export type ReportReason =
  | "harassment"
  | "fake_profile"
  | "quality"
  | "safety"
  | "fraud"
  | "misuse"
  | "spam"
  | "other";

export type ReportStatus =
  | "open"
  | "reviewing"
  | "resolved_dismissed"
  | "resolved_warning"
  | "resolved_refund"
  | "resolved_ban";

export interface Report {
  id: string;
  reporterUid: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerUid?: string;
  reason: ReportReason;
  details: string;
  evidenceUrls: string[];
  status: ReportStatus;
  moderatorNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Timestamp | any;
  createdAt: Timestamp | any;
}

// ─────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────
export type DisputeOutcome =
  | "pending"
  | "full_refund"
  | "partial_refund"
  | "released_to_host"
  | "dismissed";

export interface Dispute {
  id: string;
  planId: string;
  planTitle: string;
  filedByUid: string;
  filedByName: string;
  againstUid: string;
  againstName: string;
  reason: string;
  evidenceUrls: string[];
  amount: number;          
  outcome: DisputeOutcome;
  moderatorNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Timestamp | any;
  createdAt: Timestamp | any;
}

// ─────────────────────────────────────────────────────────
// Three-Strike System
// ─────────────────────────────────────────────────────────
export type StrikeReason =
  | "harassment"
  | "false_report"
  | "no_show_abuse"
  | "off_platform_money"
  | "sos_abuse"
  | "other";

export interface Strike {
  id: string;
  uid: string;
  reason: StrikeReason;
  reportId?: string;
  issuedBy: string;        
  notes?: string;
  active: boolean;
  expiresAt: Timestamp | any;    
  createdAt: Timestamp | any;
}

export const SOS_DURATION_MS = 30 * 60 * 1000;             
export const SOS_CANCEL_WINDOW_MS = 10 * 1000;              
export const SOS_ESCALATION_MS = 2 * 60 * 1000;             
export const LIVE_LOCATION_DURATION_MS = 2 * 60 * 60 * 1000; 
export const LIVE_LOCATION_INTERVAL_MS = 30 * 1000;         
export const MAX_EMERGENCY_CONTACTS = 3;
export const STRIKE_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;   