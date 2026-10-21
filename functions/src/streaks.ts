// functions/src/streaks.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

// Helper: Get ISO Week String (e.g., "2024-W42")
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * 1. Weekly Evaluator (Runs Monday at 00:00 UTC)
 * Checks who completed a plan last week and updates their streak.
 */
export const evaluateWeeklyStreaks = onSchedule(
  { schedule: "0 0 * * 1", timeZone: "UTC" },
  async () => {
    const now = new Date();
    // Calculate dates for *last* week
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);
    lastWeekStart.setHours(0, 0, 0, 0);
    
    const lastWeekEnd = new Date(now);
    lastWeekEnd.setHours(0, 0, 0, 0);

    const lastWeekId = getISOWeek(lastWeekStart);

    // 1. Find all plans completed last week
    const plansSnap = await db.collection("plans")
      .where("status", "==", "completed")
      .where("endTime", ">=", admin.firestore.Timestamp.fromDate(lastWeekStart))
      .where("endTime", "<", admin.firestore.Timestamp.fromDate(lastWeekEnd))
      .get();

    const activeUids = new Set<string>();
    plansSnap.forEach(doc => {
      const plan = doc.data();
      if (plan.participants) {
        plan.participants.forEach((uid: string) => activeUids.add(uid));
      }
    });

    // 2. Fetch all users to evaluate
    const usersSnap = await db.collection("users").get();
    const batch = db.batch();

    usersSnap.forEach(userDoc => {
      const user = userDoc.data();
      const currentStreak = user.currentStreak || 0;
      const bestStreak = user.bestStreak || 0;
      const freezes = user.streakFreezes ?? 1;
      const lastWeek = user.lastStreakWeek || "";

      // Prevent double-evaluating if they already have this week logged
      if (lastWeek === lastWeekId) return;

      if (activeUids.has(userDoc.id)) {
        // User was active! Extend streak.
        const newStreak = currentStreak + 1;
        const newBest = Math.max(newStreak, bestStreak);
        
        batch.update(userDoc.ref, {
          currentStreak: newStreak,
          bestStreak: newBest,
          lastStreakWeek: lastWeekId,
        });
      } else {
        // User was NOT active. Check for freeze.
        if (currentStreak > 0) {
          if (freezes > 0) {
            // Use a freeze automatically
            batch.update(userDoc.ref, {
              streakFreezes: freezes - 1,
              lastStreakWeek: lastWeekId,
            });
            logger.info(`Auto-used freeze for ${userDoc.id}`);
          } else {
            // Streak broken
            batch.update(userDoc.ref, {
              currentStreak: 0,
              lastStreakWeek: lastWeekId,
            });
            logger.info(`Streak broken for ${userDoc.id}`);
          }
        }
      }
    });

    await batch.commit();
    logger.info(`Evaluated streaks for week ${lastWeekId}.`);
  }
);

/**
 * 2. Streak At Risk Notifier (Runs Sunday at 20:00 UTC)
 * Alerts users who have a streak but haven't completed a plan this week.
 */
export const notifyStreakAtRisk = onSchedule(
  { schedule: "0 20 * * 0", timeZone: "UTC" },
  async () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekId = getISOWeek(now);

    // 1. Find who has completed a plan THIS week
    const plansSnap = await db.collection("plans")
      .where("status", "==", "completed")
      .where("endTime", ">=", admin.firestore.Timestamp.fromDate(startOfWeek))
      .get();

    const activeUids = new Set<string>();
    plansSnap.forEach(doc => {
      doc.data().participants?.forEach((uid: string) => activeUids.add(uid));
    });

    // 2. Find users with an active streak who aren't in that set
    const usersSnap = await db.collection("users")
      .where("currentStreak", ">", 0)
      .get();

    const promises: Promise<any>[] = [];

    usersSnap.forEach(userDoc => {
      if (activeUids.has(userDoc.id)) return; // Safe
      const user = userDoc.data();
      if (user.lastStreakWeek === thisWeekId) return; // Already evaluated this week (e.g., used freeze)

      // Send push notification
      promises.push(
        db.collection("deviceTokens").doc(userDoc.id).get().then(tokenSnap => {
          const token = tokenSnap.data()?.token;
          if (!token) return;
          return fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({
              to: token,
              title: "🔥 Your streak is at risk!",
              body: `You haven't attended a plan this week. Use a freeze or join a plan to keep your ${user.currentStreak}-week streak alive!`,
              data: { type: "streak_risk" },
              sound: "default",
            }),
          });
        })
      );
    });

    await Promise.all(promises);
    logger.info(`Sent streak risk alerts to ${promises.length} users.`);
  }
);

/**
 * 3. Use Freeze Callable API
 */
export const useStreakFreeze = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const uid = request.auth.uid;

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  
  if (!userSnap.exists) throw new HttpsError("not-found", "User not found");
  const user = userSnap.data()!;

  const freezes = user.streakFreezes ?? 1;
  if (freezes <= 0) {
    throw new HttpsError("failed-precondition", "No freezes available.");
  }

  const thisWeekId = getISOWeek(new Date());

  await userRef.update({
    streakFreezes: freezes - 1,
    lastStreakWeek: thisWeekId, // Marks the week as "handled"
  });

  return { success: true };
});