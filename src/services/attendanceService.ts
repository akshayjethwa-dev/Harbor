// src/services/attendanceService.ts
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";
import { Plan } from "../types/plan";

/**
 * Organizer submits the attendance list.
 */
export async function markAttendance(
  planId: string,
  noShowUids: string[],
  excusedUids: string[]
): Promise<void> {
  const planRef = doc(db, "plans", planId);
  await updateDoc(planRef, {
    noShowUids,
    excusedUids,
    attendanceMarked: true,
    noShowMarkedAt: serverTimestamp(),
  });
}

/**
 * A user disputes their no-show status.
 */
export async function disputeNoShow(
  planId: string,
  uid: string
): Promise<void> {
  const planRef = doc(db, "plans", planId);
  
  // Remove from noShow and mark as un-marked so organizer can review
  await updateDoc(planRef, {
    noShowUids: arrayRemove(uid),
    attendanceMarked: false, // Forces organizer to re-submit
    lastDisputeAt: serverTimestamp(),
    lastDisputeBy: uid,
  });
}