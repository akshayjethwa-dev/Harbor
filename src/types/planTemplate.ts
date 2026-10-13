import { Timestamp } from "firebase/firestore";
import { PlanActivity, ApprovalMode, PlanRequirements, PlanVisibility } from "./plan";

export interface PlanTemplate {
  id: string;
  ownerUid: string;
  name: string;
  nameLower: string;
  activity: PlanActivity;
  activityCustom?: string;
  title: string;
  description: string;
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
  usedCount: number;
  lastUsedAt: Timestamp | any;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}

export interface PlanTemplateDraft {
  name: string;
  activity: PlanActivity;
  activityCustom?: string;
  title: string;
  description: string;
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
}