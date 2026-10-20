// src/types/task.ts
import { Timestamp } from "firebase/firestore";

export type TaskPriority = "low" | "medium" | "high";

export interface PlanTask {
  id: string;
  planId: string;
  title: string;
  description: string;
  assigneeUid: string | null;
  assigneeName: string | null;
  assigneePhotoUrl: string | null;
  dueDate: Timestamp | null;
  priority: TaskPriority;
  category: string;
  order: number;
  isArchived: boolean;
  createdAt: Timestamp | any;
  /** Timestamp of when the current assignee claimed it. Used for the 5-min unclaim window. */
  claimedAt?: Timestamp | null; // <-- ADD THIS
  isCompleted?: boolean;
  completedAt?: Timestamp | null;
  completedBy?: string | null;
  completedByName?: string | null;
  completedLate?: boolean;
  reactions?: Record<string, string[]>;
}

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "#4CAF50" }, // Green
  { value: "medium", label: "Medium", color: "#FF9800" }, // Orange
  { value: "high", label: "High", color: "#F44336" }, // Red
];