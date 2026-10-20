// src/types/activity.ts
import { Timestamp } from "firebase/firestore";

export type ActivityType = 
  | "task_completed" 
  | "expense_added" 
  | "date_changed" 
  | "member_joined" 
  | "idea_proposed" 
  | "comment_added";

export interface PlanActivity {
  id: string;
  planId: string;
  type: ActivityType;
  actorUid: string;
  actorName: string;
  actorPhotoUrl: string | null;
  metadata: Record<string, any>; // e.g., { taskTitle: "Book venue" } or { amount: 500 }
  isPrivate: boolean; 
  isDeleted: boolean;
  createdAt: Timestamp | any;
}