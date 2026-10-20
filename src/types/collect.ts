// src/types/collect.ts
import { Timestamp } from "firebase/firestore";

export type CollectStatus = "pending" | "paid" | "declined" | "excluded";

export interface CollectTarget {
  uid: string;
  name: string;
  amount: number;
  status: CollectStatus;
  upiId: string | null;
}

export interface CollectRequest {
  id: string;
  planId: string;
  organizerId: string;
  organizerName: string;
  organizerUpiId: string;
  title: string;
  totalAmount: number;
  targets: CollectTarget[];
  status: "active" | "completed" | "expired" | "cancelled";
  createdAt: Timestamp | any;
  expiresAt: Timestamp | any;
}