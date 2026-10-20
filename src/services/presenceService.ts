// src/services/presenceService.ts
import { db } from "../lib/firebase";
import { doc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from "firebase/firestore";
import { PresenceRecord } from "../types/presence";
import { GarbaCrewUser } from "../types/user";

const presenceRef = (planId: string) => collection(db, "plans", planId, "presence");

export async function updatePresence(
  planId: string,
  user: GarbaCrewUser,
  status: "active" | "away"
): Promise<void> {
  if (user.presenceEnabled === false) return; // Privacy opt-out

  const ref = doc(presenceRef(planId), user.uid);
  await setDoc(ref, {
    uid: user.uid,
    name: user.name || "Unknown",
    photoUrl: user.photoUrl || null,
    lastActiveAt: serverTimestamp(),
    status,
  }, { merge: true });
}

export async function removePresence(planId: string, uid: string): Promise<void> {
  await deleteDoc(doc(presenceRef(planId), uid));
}

export function subscribeToPresence(
  planId: string,
  callback: (viewers: PresenceRecord[]) => void
) {
  return onSnapshot(presenceRef(planId), (snap) => {
    const viewers = snap.docs.map(d => d.data() as PresenceRecord);
    callback(viewers);
  });
}