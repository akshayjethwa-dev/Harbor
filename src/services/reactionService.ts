// src/services/reactionService.ts
import { db } from "../lib/firebase";
import { doc, runTransaction } from "firebase/firestore";

/**
 * Toggles an emoji reaction on a task or expense.
 * Uses a transaction to prevent rapid-tap race conditions.
 */
export async function toggleReaction(
  collectionName: "tasks" | "expenses",
  planId: string,
  itemId: string,
  emoji: string,
  uid: string
): Promise<void> {
  const ref = doc(db, "plans", planId, collectionName, itemId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("This item no longer exists.");
    }

    const data = snap.data();
    const currentReactions: Record<string, string[]> = data.reactions || {};
    const users = currentReactions[emoji] || [];

    let newUsers: string[];
    if (users.includes(uid)) {
      // Remove reaction
      newUsers = users.filter((id) => id !== uid);
    } else {
      // Add reaction
      newUsers = [...users, uid];
    }

    const newReactions = { ...currentReactions, [emoji]: newUsers };
    
    // Clean up empty arrays to keep the document size small
    if (newUsers.length === 0) {
      delete newReactions[emoji];
    }

    tx.update(ref, { reactions: newReactions });
  });
}