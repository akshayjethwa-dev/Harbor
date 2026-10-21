// src/types/payout.ts
import { Timestamp } from "firebase/firestore";

export type PayoutStatus = "pending" | "processing" | "paid" | "failed" | "refunded";

export interface HostPayout {
  id: string;
  hostUid: string;
  planId: string;
  planTitle: string;
  grossAmount: number;     // Total collected from participants
  platformFee: number;     // Harbor's cut (e.g., 10%)
  netAmount: number;       // grossAmount - platformFee
  status: PayoutStatus;
  createdAt: Timestamp | any;
  processedAt?: Timestamp | any;
  upiId: string;
  refundReason?: string;
}