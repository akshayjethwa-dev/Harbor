// src/types/idea.ts
import { Timestamp } from "firebase/firestore";

export interface PlanIdea {
  id: string;
  planId: string;
  title: string;
  description: string;
  link: string | null;
  location: string | null;
  estimatedCost: number | null;
  
  proposerUid: string;
  proposerName: string;
  proposerPhotoUrl: string | null;
  
  upvotes: string[];   // UIDs of users who voted up
  downvotes: string[]; // UIDs of users who voted down
  
  isPostDecision: boolean;
  isReported: boolean;
  createdAt: Timestamp | any;
}