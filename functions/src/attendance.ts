// functions/src/attendance.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

// 1. Process No-Shows & Apply Penalties
export const onAttendanceMarked = onDocumentUpdated("plans/{planId}", async (event) => {
  if (!event.data) return;
  const before = event.data.before.data();
  const after = event.data.after.data();
  const planId = event.params.planId;

  // Only run when attendance is newly marked
  if (before.attendanceMarked === true || after.attendanceMarked !== true) return;

  const noShowUids: string[] = after.noShowUids || [];
  const isPaid = (after.costTotal || 0) > 0;

  const batch = db.batch();

  for (const uid of noShowUids) {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    
    // FIX 1: exists is a property in Admin SDK, not a function
    if (!userSnap.exists) continue;
    
    // FIX 2 & 3: Ensure data() is not undefined
    const user = userSnap.data();
    if (!user) continue;

    const currentScore = user.guestScore ?? 50;
    const newNoShowCount = (user.noShowCount || 0) + 1;

    // Penalty: -10 Guest Score per no-show
    const newScore = Math.max(0, currentScore - 10);

    const updates: any = {
      guestScore: newScore,
      noShowCount: newNoShowCount,
    };

    // Suspension Logic: 3 strikes = 7-day ban
    if (newNoShowCount >= 3) {
      const suspendUntil = new Date();
      suspendUntil.setDate(suspendUntil.getDate() + 7);
      updates.suspendedUntil = admin.firestore.Timestamp.fromDate(suspendUntil);
      logger.warn(`User ${uid} suspended until ${suspendUntil.toISOString()} for repeat no-shows.`);
    }

    batch.update(userRef, updates);

    // Refund Logic (if paid plan)
    if (isPaid) {
      logger.info(`Triggering refund for no-show user ${uid} on paid plan ${planId}`);
      // In a real app, you would call your payment provider here (e.g., Stripe/Razorpay refund)
    }
  }

  await batch.commit();
  logger.info(`Processed attendance for plan ${planId}. ${noShowUids.length} no-shows.`);
});

// 2. Auto-Mark Fallback (Runs 24h after plan ends)
export const autoMarkAttendance = onSchedule(
  { schedule: "0 2 * * *", timeZone: "UTC" }, // Daily at 2 AM
  async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const plansSnap = await db.collection("plans")
      .where("status", "==", "open") 
      .where("attendanceMarked", "==", false)
      .where("endTime", "<=", admin.firestore.Timestamp.fromDate(yesterday))
      .get();

    if (plansSnap.empty) return;

    const batch = db.batch();
    plansSnap.forEach((doc) => {
      const plan = doc.data();
      const participants: string[] = plan.participants || [];
      const checkIns: Record<string, any> = plan.checkIns || {};
      
      // Anyone who didn't check in is a no-show
      const noShowUids = participants.filter(uid => !checkIns[uid]);

      batch.update(doc.ref, {
        noShowUids,
        excusedUids: [],
        attendanceMarked: true,
        noShowMarkedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    logger.info(`Auto-marked attendance for ${plansSnap.size} expired plans.`);
  }
);