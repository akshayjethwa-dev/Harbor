// src/services/activityService.ts
import { db } from "../lib/firebase";
import {
  collection, doc, addDoc, onSnapshot, query, orderBy, limit, startAfter, serverTimestamp, updateDoc, QueryDocumentSnapshot
} from "firebase/firestore";
import { PlanActivity } from "../types/activity";

const activityRef = (planId: string) => collection(db, "plans", planId, "activity");

/**
 * Log a new activity to the plan feed.
 */
export async function logActivity(
  planId: string,
  type: PlanActivity["type"],
  actor: { uid: string; name: string; photoUrl: string | null },
  metadata: Record<string, any> = {},
  isPrivate: boolean = false
): Promise<void> {
  await addDoc(activityRef(planId), {
    planId,
    type,
    actorUid: actor.uid,
    actorName: actor.name,
    actorPhotoUrl: actor.photoUrl,
    metadata,
    isPrivate,
    isDeleted: false,
    createdAt: serverTimestamp(),
  });
}

/**
 * Soft delete an activity (marks it as [deleted]).
 */
export async function softDeleteActivity(planId: string, activityId: string): Promise<void> {
  await updateDoc(doc(db, "plans", planId, "activity", activityId), {
    isDeleted: true,
  });
}

const PAGE_SIZE = 20;

/**
 * Subscribe to the paginated activity feed.
 * (Note: Real-time pagination in Firestore is tricky. For simplicity here, we fetch the 
 * first page live, and subsequent pages via manual fetch, or we can use a simple limit approach.)
 * 
 * To keep it fully real-time AND paginated, we use a limit query. If they want to see older
 * items, we increase the limit.
 */
export function subscribeToActivityFeed(
  planId: string,
  currentLimit: number,
  callback: (activities: PlanActivity[]) => void
) {
  const q = query(
    activityRef(planId),
    orderBy("createdAt", "desc"),
    limit(currentLimit)
  );

  return onSnapshot(q, (snap) => {
    const activities = snap.docs.map(d => ({ id: d.id, ...d.data() } as PlanActivity));
    callback(activities);
  });
}