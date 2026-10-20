// src/types/comment.ts
import { Timestamp } from "firebase/firestore";

export type CommentItemType = "task" | "expense" | "itinerary";

export interface PlanComment {
  id: string;
  planId: string;
  itemId: string;
  itemType: CommentItemType;
  parentId: string | null; // null for top-level, string for replies
  
  text: string;
  authorUid: string;
  authorName: string;
  authorPhotoUrl: string | null;
  
  isDeleted: boolean;
  isReported: boolean;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}