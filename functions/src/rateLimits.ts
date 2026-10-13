import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

const DAILY_LIMIT = 2;
const WEEKLY_LIMIT = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Called from the client before opening the create wizard.
 * Returns whether the user is allowed and how many they have left.
 */
export const getPlanCreationQuota = onCall(
  { invoker: "public", region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    return computeQuota(request.auth.uid);
  }
);

/**
 * Fires whenever a new Plan is created.
 * Updates the user's rate-limit counters.
 */
export const onPlanCreatedUpdateQuota = onDocumentCreated(
  "plans/{planId}",
  async (event) => {
    const plan = event.data?.data();
    if (!plan?.hostUid) return;
    const uid = plan.hostUid;

    const now = Date.now();
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return;

    const data = snap.data()!;
    let dayStart = data.planDayStart?.toMillis?.() ?? 0;
    let weekStart = data.planWeekStart?.toMillis?.() ?? 0;

    if (now - dayStart > MS_PER_DAY) {
      dayStart = now;
      await ref.update({ plansCreatedToday: 0 });
    }
    if (now - weekStart > MS_PER_WEEK) {
      weekStart = now;
      await ref.update({ plansCreatedThisWeek: 0 });
    }

    await ref.update({
      plansCreatedToday: FieldValue.increment(1),
      plansCreatedThisWeek: FieldValue.increment(1),
      planDayStart: Timestamp.fromMillis(dayStart),
      planWeekStart: Timestamp.fromMillis(weekStart),
    });

    logger.info(`Rate limit updated for ${uid}`);
  }
);

async function computeQuota(uid: string) {
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return {
      allowed: true,
      dailyUsed: 0,
      dailyLimit: DAILY_LIMIT,
      weeklyUsed: 0,
      weeklyLimit: WEEKLY_LIMIT,
      dailyRemaining: DAILY_LIMIT,
      weeklyRemaining: WEEKLY_LIMIT,
    };
  }

  const data = snap.data()!;
  const now = Date.now();
  let dailyUsed = data.plansCreatedToday ?? 0;
  let weeklyUsed = data.plansCreatedThisWeek ?? 0;

  const dayStart = data.planDayStart?.toMillis?.() ?? 0;
  const weekStart = data.planWeekStart?.toMillis?.() ?? 0;

  if (now - dayStart > MS_PER_DAY) dailyUsed = 0;
  if (now - weekStart > MS_PER_WEEK) weeklyUsed = 0;

  const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyUsed);
  const weeklyRemaining = Math.max(0, WEEKLY_LIMIT - weeklyUsed);

  return {
    allowed: dailyRemaining > 0 && weeklyRemaining > 0,
    dailyUsed,
    dailyLimit: DAILY_LIMIT,
    weeklyUsed,
    weeklyLimit: WEEKLY_LIMIT,
    dailyRemaining,
    weeklyRemaining,
  };
}