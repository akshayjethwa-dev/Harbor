// src/services/checkInService.ts
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plan } from "../types/plan";
import { GarbaCrewUser } from "../types/user";

export interface CheckInResult {
  ok: boolean;
}

/**
 * Marks a user as checked in for a plan using Firestore directly.
 * (In a high-security app, this would be a Cloud Function call).
 */
export async function checkInToPlan(
  planId: string,
  user: GarbaCrewUser
): Promise<CheckInResult> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  
  if (!planSnap.exists()) throw new Error("Plan not found");
  const plan = planSnap.data() as Plan;

  if (!plan.participants.includes(user.uid)) {
    throw new Error("You are not registered for this plan.");
  }

  // Idempotency: If already checked in, just return
  if (plan.checkIns?.[user.uid]) {
    return { ok: true };
  }

  await updateDoc(planRef, {
    [`checkIns.${user.uid}`]: {
      uid: user.uid,
      name: user.name ?? "Someone",
      photoUrl: user.photoUrl ?? null,
      checkedInAt: serverTimestamp(),
    },
  });

  return { ok: true };
}

/**
 * Returns the check-in window state for a Plan.
 */
export function getCheckInState(
  plan: { startTime: any; endTime: any; checkIns?: Record<string, any> },
  uid: string
): {
  canCheckIn: boolean;
  alreadyCheckedIn: boolean;
  reason?: string;
} {
  const startMs = plan.startTime?.toMillis?.() ?? 0;
  const endMs = plan.endTime?.toMillis?.() ?? 0;
  
  if (!startMs) return { canCheckIn: false, alreadyCheckedIn: false, reason: "No start time" };

  const now = Date.now();
  const windowMs = 30 * 60 * 1000; // 30 mins before
  const already = !!plan.checkIns?.[uid];

  if (already) {
    return { canCheckIn: false, alreadyCheckedIn: true };
  }

  if (now < startMs - windowMs) {
    const mins = Math.round((startMs - now) / 60000);
    return {
      canCheckIn: false,
      alreadyCheckedIn: false,
      reason: `Check-in opens in ${mins} min`,
    };
  }

  // Check-in closes 2 hours after the plan ends (or when finalized)
  if (now > endMs + 2 * 60 * 60 * 1000) {
    return {
      canCheckIn: false,
      alreadyCheckedIn: false,
      reason: "Check-in window closed",
    };
  }

  return { canCheckIn: true, alreadyCheckedIn: false };
}