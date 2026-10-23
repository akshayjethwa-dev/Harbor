// src/services/monetizationService.ts
import { db } from "../lib/firebase";
import { 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../lib/firebase"; // <-- Import the default app export
import { Subscription, SubscriptionTier } from "../types/subscription";

// Initialize functions instance matching your region
const functions = getFunctions(app, "asia-south1");

/**
 * Listen to real-time updates for the user's subscription.
 */
export function subscribeToSubscription(
  uid: string,
  callback: (sub: Subscription | null) => void
) {
  return onSnapshot(doc(db, "subscriptions", uid), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as Subscription);
    } else {
      callback(null);
    }
  });
}

/**
 * Cancel Subscription (at period end).
 */
export async function cancelSubscription(uid: string): Promise<void> {
  const cancelFn = httpsCallable(functions, "cancelSubscription");
  await cancelFn({ uid });
}

/**
 * Resume Subscription (undo cancel).
 */
export async function resumeSubscription(uid: string): Promise<void> {
  const resumeFn = httpsCallable(functions, "resumeSubscription");
  await resumeFn({ uid });
}

/**
 * Upgrade/Downgrade Subscription (prorated).
 */
export async function changeSubscriptionTier(
  uid: string,
  newTier: SubscriptionTier
): Promise<string> {
  const upgradeFn = httpsCallable(functions, "createCheckoutSession");
  const result = await upgradeFn({ uid, tier: newTier });
  return (result.data as any).url;
}

/**
 * Check if the user is currently in a grace period due to failed payment.
 */
export function isInGracePeriod(sub: Subscription): boolean {
  if (sub.status !== "past_due" || !sub.gracePeriodEndsAt) return false;
  const graceEnd = sub.gracePeriodEndsAt.toMillis?.() ?? new Date(sub.gracePeriodEndsAt).getTime();
  return Date.now() < graceEnd;
}

/**
 * Submit a new vendor application.
 * This fixes the error in app/vendor/onboarding.tsx
 */
export async function submitVendorApplication(applicationData: any): Promise<void> {
  try {
    // Creates a new document in the "vendorApplications" collection
    await addDoc(collection(db, "vendorApplications"), {
      ...applicationData,
      status: "pending", // Default status for new applications
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error submitting vendor application:", error);
    throw error;
  }
}