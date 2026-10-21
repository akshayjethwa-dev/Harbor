// src/types/subscription.ts
import { Timestamp } from "firebase/firestore";

export type SubscriptionTier = "free" | "plus" | "pro" | "host";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

export interface Subscription {
  uid: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  
  // Payment Provider IDs
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  
  // Dates
  currentPeriodStart: Timestamp | any;
  currentPeriodEnd: Timestamp | any;
  trialEnd?: Timestamp | any;
  
  // Edge Case Flags
  cancelAtPeriodEnd: boolean;
  gracePeriodEndsAt?: Timestamp | any; // For past_due status

  hostSubscriptionTier?: SubscriptionTier; // Denormalized for priority sorting & badges
  requiresWaiver?: boolean;
}