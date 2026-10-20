// src/services/collectService.ts
import { db } from "../lib/firebase";
import {
  collection, doc, addDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp, runTransaction
} from "firebase/firestore";
import { CollectRequest, CollectTarget } from "../types/collect";

const collectRef = (planId: string) => collection(db, "plans", planId, "collectRequests");

export function subscribeToCollectRequests(
  planId: string,
  callback: (requests: CollectRequest[]) => void
) {
  const q = query(collectRef(planId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, planId, ...d.data() } as CollectRequest)));
  });
}

export async function createCollectRequest(
  planId: string,
  organizer: { uid: string; name: string; upiId: string },
  title: string,
  totalAmount: number,
  targets: CollectTarget[]
): Promise<string> {
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + 24 * 60 * 60 * 1000); // 24 hours

  const docRef = await addDoc(collectRef(planId), {
    planId,
    organizerId: organizer.uid,
    organizerName: organizer.name,
    organizerUpiId: organizer.upiId,
    title,
    totalAmount,
    targets,
    status: "active",
    createdAt: serverTimestamp(),
    expiresAt,
  });
  return docRef.id;
}

/**
 * Safely update a target's payment status within a transaction.
 * Automatically marks the whole request as "completed" if all targets are resolved.
 */
export async function updateTargetStatus(
  planId: string,
  requestId: string,
  targetUid: string,
  newStatus: "paid" | "declined" | "pending"
): Promise<void> {
  const docRef = doc(db, "plans", planId, "collectRequests", requestId);
  
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists()) return;
    
    const data = snap.data() as CollectRequest;
    
    // Update the specific target
    const updatedTargets = data.targets.map(t => 
      t.uid === targetUid ? { ...t, status: newStatus } : t
    );
    
    // Check if everyone has either paid or been excluded
    const allResolved = updatedTargets.every(t => t.status === "paid" || t.status === "excluded");
    const newRequestStatus = allResolved ? "completed" : data.status;

    tx.update(docRef, { targets: updatedTargets, status: newRequestStatus });
  });
}