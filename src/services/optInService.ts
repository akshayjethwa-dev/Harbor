// src/services/optInService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plan } from "../types/plan";
import { createChatIfAllowed } from "./chatGateService"; // <-- NEW IMPORT

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export interface PlanOptIn {
  planId: string;
  fromUid: string;
  toUid: string;
  value: boolean;
  createdAt: Timestamp | any;
}

// ─────────────────────────────────────────────────────────
// Fetch plans that are eligible for the opt‑in prompt
// ─────────────────────────────────────────────────────────
export async function getPendingOptInPlans(uid: string): Promise<Plan[]> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const q = query(
    collection(db, "plans"),
    where("participants", "array-contains", uid),
    where("endTime", "<", Timestamp.fromDate(thirtyMinutesAgo))
  );

  const snap = await getDocs(q);
  const plans: Plan[] = [];

  for (const docSnap of snap.docs) {
    const plan = { id: docSnap.id, ...docSnap.data() } as Plan;

    // Rule: Do not surface if only one attendee
    if (plan.participants.length <= 1) continue;

    // Rule: Do not surface if the user was marked as a no‑show
    if (plan.noShowUids?.includes(uid)) continue;

    // Rule: Do not surface if the user has already submitted opt‑ins
    const optInQuery = query(
      collection(db, "planOptIns"),
      where("planId", "==", plan.id),
      where("fromUid", "==", uid)
    );
    const optInSnap = await getDocs(optInQuery);
    if (!optInSnap.empty) continue;

    plans.push(plan);
  }

  return plans;
}

// ─────────────────────────────────────────────────────────
// Submit a single directional opt‑in
// ─────────────────────────────────────────────────────────
export async function submitOptIn(
  planId: string,
  fromUid: string,
  toUid: string,
  value: boolean
): Promise<void> {
  const docId = `${planId}_${fromUid}_${toUid}`;
  await setDoc(doc(db, "planOptIns", docId), {
    planId,
    fromUid,
    toUid,
    value,
    createdAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// Check for a mutual match and create a chat if both said yes
// ─────────────────────────────────────────────────────────
export async function checkAndCreateMatch(
  planId: string,
  uidA: string,
  uidB: string
): Promise<{ matched: boolean; chatId?: string }> {
  const docA = await getDoc(doc(db, "planOptIns", `${planId}_${uidA}_${uidB}`));
  const docB = await getDoc(doc(db, "planOptIns", `${planId}_${uidB}_${uidA}`));

  if (!docA.exists() || !docB.exists()) return { matched: false };

  const dataA = docA.data() as PlanOptIn;
  const dataB = docB.data() as PlanOptIn;

  if (dataA.value !== true || dataB.value !== true) return { matched: false };

  // Gate check: Ensure neither has blocked/reported the other
  const chatResult = await createChatIfAllowed(uidA, uidB, planId);

  if (!chatResult.success || !chatResult.chatId) {
    // Match is mutual, but chat is not allowed (e.g. blocked)
    return { matched: false };
  }

  const chatId = chatResult.chatId;

  // Persist the match
  const matchId = [uidA, uidB].sort().join("_");
  const matchRef = doc(db, "planOptInMatches", `${planId}_${matchId}`);
  
  // Check if it already exists to prevent duplicate notifications
  const existingMatch = await getDoc(matchRef);
  if (!existingMatch.exists()) {
    await setDoc(matchRef, {
      planId,
      users: [uidA, uidB],
      chatId,
      matchedAt: serverTimestamp(),
    });

    // Write notifications
    await addDoc(collection(db, "notifications"), {
      toUid: uidA,
      type: "plan_opt_in_match",
      title: "You both want to stay in touch!",
      body: `You and ${uidB} both want to stay in touch.`,
      data: { chatId, planId },
      createdAt: serverTimestamp(),
      read: false,
    });

    await addDoc(collection(db, "notifications"), {
      toUid: uidB,
      type: "plan_opt_in_match",
      title: "You both want to stay in touch!",
      body: `You and ${uidA} both want to stay in touch.`,
      data: { chatId, planId },
      createdAt: serverTimestamp(),
      read: false,
    });
  }

  return { matched: true, chatId };
}