// src/services/chatGateService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export interface ChatPermission {
  allowed: boolean;
  reason?: string;
}

// ─────────────────────────────────────────────────────────
// Core Gate Check
// ─────────────────────────────────────────────────────────
/**
 * Returns whether a 1:1 chat is allowed between two users.
 * Rules:
 * 1. Neither user has blocked the other.
 * 2. Neither user has an open report against the other.
 * 3. If planId is provided, both users must have mutually opted in via `planOptIns`.
 * 4. If no planId is provided, both users must have mutually swiped right via `partnerSwipes`.
 */
export async function isChatAllowed(
  uidA: string,
  uidB: string,
  planId?: string
): Promise<ChatPermission> {
  // 1. Check blocks (both directions)
  const blockAtoB = await getDoc(doc(db, "blocks", `${uidA}_${uidB}`));
  const blockBtoA = await getDoc(doc(db, "blocks", `${uidB}_${uidA}`));

  if (blockAtoB.exists() || blockBtoA.exists()) {
    return { allowed: false, reason: "One user has blocked the other." };
  }

  // 2. Check reports (any open report between the two)
  const reportsQuery = query(
    collection(db, "reports"),
    where("reporterUid", "in", [uidA, uidB]),
    where("targetOwnerUid", "in", [uidA, uidB]),
    where("status", "==", "open")
  );
  const reportsSnap = await getDocs(reportsQuery);
  if (!reportsSnap.empty) {
    return { allowed: false, reason: "An open report exists between these users." };
  }

  // 3. Check mutual opt-in (Plan-based)
  if (planId) {
    const optInA = await getDoc(doc(db, "planOptIns", `${planId}_${uidA}_${uidB}`));
    const optInB = await getDoc(doc(db, "planOptIns", `${planId}_${uidB}_${uidA}`));

    if (!optInA.exists() || !optInB.exists()) {
      return { allowed: false, reason: "Both users have not opted in." };
    }

    const dataA = optInA.data();
    const dataB = optInB.data();

    if (dataA.value !== true || dataB.value !== true) {
      return { allowed: false, reason: "Both users have not opted in." };
    }
  } else {
    // 4. Check mutual swipe (Partner-based)
    const swipeA = await getDoc(doc(db, "partnerSwipes", `${uidA}_${uidB}`));
    const swipeB = await getDoc(doc(db, "partnerSwipes", `${uidB}_${uidA}`));

    if (!swipeA.exists() || !swipeB.exists()) {
      return { allowed: false, reason: "Both users have not mutually swiped right." };
    }

    const dataA = swipeA.data();
    const dataB = swipeB.data();

    if (dataA.direction !== "right" || dataB.direction !== "right") {
      return { allowed: false, reason: "Both users have not mutually swiped right." };
    }
  }

  return { allowed: true };
}

// ─────────────────────────────────────────────────────────
// Safe Chat Creation
// ─────────────────────────────────────────────────────────
/**
 * Creates a 1:1 chat if the gate allows it.
 * Returns the existing chatId if a chat already exists.
 */
export async function createChatIfAllowed(
  uidA: string,
  uidB: string,
  planId?: string
): Promise<{ success: boolean; chatId?: string; reason?: string }> {
  const permission = await isChatAllowed(uidA, uidB, planId);
  if (!permission.allowed) {
    return { success: false, reason: permission.reason };
  }

  // Deterministic chatId so we don't create duplicate threads
  const sortedUids = [uidA, uidB].sort();
  const chatId = planId
    ? `plan_${planId}_${sortedUids.join("_")}`
    : `direct_${sortedUids.join("_")}`;

  const chatRef = doc(db, "chats", chatId);
  const existing = await getDoc(chatRef);

  if (!existing.exists()) {
    await setDoc(chatRef, {
      type: planId ? "plan_opt_in" : "partner_match",
      planId: planId ?? null,
      users: [uidA, uidB],
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageAt: null,
    });
  }

  return { success: true, chatId };
}