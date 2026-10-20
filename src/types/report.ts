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