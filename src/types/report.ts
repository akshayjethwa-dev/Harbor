// src/types/report.ts
import { Timestamp } from "firebase/firestore";

export type ProfileReportReason = 
  | "fake_profile"
  | "inappropriate_photos"
  | "harassment"
  | "spam"
  | "other";

export interface ProfileReport {
  id: string;
  targetUid: string;
  targetName: string;
  reporterUid: string;
  reporterName: string;
  reason: ProfileReportReason;
  details?: string;
  status: "pending" | "reviewed" | "dismissed";
  isFalseReport?: boolean;
  createdAt: Timestamp | any;
}

// ─── Task 38: Chat Harassment ───
export type ChatReportReason = "harassment" | "hate_speech" | "spam" | "threats" | "other";

export interface ChatReport {
  id: string;
  contextType: "plan" | "squad";
  contextId: string;       // planId or squadId
  messageId: string;
  messageText: string;     // Snapshot of the text
  chatId: string;
  
  offenderUid: string;
  offenderName: string;
  
  reporterUid: string;
  reporterName: string;
  
  reason: ChatReportReason;
  details?: string;
  screenshotUrl?: string;
  
  status: "pending" | "reviewed" | "action_taken" | "dismissed";
  createdAt: Timestamp | any;
}