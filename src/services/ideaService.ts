// src/services/ideaService.ts
import { db } from "../lib/firebase";
import {
  collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp, runTransaction
} from "firebase/firestore";
import { PlanIdea } from "../types/idea";

const ideasRef = (planId: string) => collection(db, "plans", planId, "ideas");

export function subscribeToIdeas(
  planId: string,
  callback: (ideas: PlanIdea[]) => void
) {
  const q = query(ideasRef(planId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, planId, ...d.data() } as PlanIdea)));
  });
}

export async function proposeIdea(
  planId: string,
  idea: Omit<PlanIdea, "id" | "planId" | "createdAt" | "upvotes" | "downvotes" | "isReported">
): Promise<string> {
  const docRef = await addDoc(ideasRef(planId), {
    ...idea,
    upvotes: [],
    downvotes: [],
    isReported: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Toggle a vote on an idea.
 */
export async function voteIdea(
  planId: string,
  ideaId: string,
  uid: string,
  voteType: "up" | "down"
): Promise<void> {
  const ref = doc(db, "plans", planId, "ideas", ideaId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Idea no longer exists.");

    const data = snap.data() as PlanIdea;
    let upvotes = data.upvotes || [];
    let downvotes = data.downvotes || [];

    const isUp = upvotes.includes(uid);
    const isDown = downvotes.includes(uid);

    if (voteType === "up") {
      if (isUp) {
        upvotes = upvotes.filter(id => id !== uid); // Remove upvote
      } else {
        upvotes.push(uid);
        downvotes = downvotes.filter(id => id !== uid); // Remove downvote if they had one
      }
    } else if (voteType === "down") {
      if (isDown) {
        downvotes = downvotes.filter(id => id !== uid); // Remove downvote
      } else {
        downvotes.push(uid);
        upvotes = upvotes.filter(id => id !== uid); // Remove upvote if they had one
      }
    }

    tx.update(ref, { upvotes, downvotes });
  });
}

export async function reportIdea(planId: string, ideaId: string): Promise<void> {
  await updateDoc(doc(db, "plans", planId, "ideas", ideaId), {
    isReported: true,
  });
}