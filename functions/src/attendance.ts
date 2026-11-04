// functions/src/attendance.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

// 1. Process Manual No-Shows & Apply Penalties (Triggered by Host)
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
    
    if (!userSnap.exists) continue;
    
    const user = userSnap.data();
    if (!user) continue;

    const currentScore = user.guestScore ?? 50;
    const newNoShowCount = (user.noShowCount || 0) + 1;
    const newScore = Math.max(0, currentScore - 10);

    const updates: any = {
      guestScore: newScore,
      noShowCount: newNoShowCount,
    };

    if (newNoShowCount >= 3) {
      const suspendUntil = new Date();
      suspendUntil.setDate(suspendUntil.getDate() + 7);
      updates.suspendedUntil = admin.firestore.Timestamp.fromDate(suspendUntil);
      logger.warn(`User ${uid} suspended until ${suspendUntil.toISOString()} for repeat no-shows.`);
    }

    batch.update(userRef, updates);

    if (isPaid) {
      logger.info(`Triggering refund for no-show user ${uid} on paid plan ${planId}`);
    }
  }

  await batch.commit();
  logger.info(`Processed manual attendance for plan ${planId}.`);
});

// 2. Auto-Finalizer (Runs daily at 2 AM)
// Finds plans that ended, checks the checkIns, and applies credits/penalties automatically.
export const autoFinalizeAttendance = onSchedule(
  { schedule: "0 2 * * *", timeZone: "UTC" },
  async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const plansSnap = await db.collection("plans")
      .where("status", "in", ["open", "full"]) // Only active plans
      .where("attendanceMarked", "==", false)
      .where("endTime", "<=", admin.firestore.Timestamp.fromDate(yesterday))
      .get();

    if (plansSnap.empty) return;

    for (const doc of plansSnap.docs) {
      const plan = doc.data();
      const participants: string[] = plan.participants || [];
      const checkIns: Record<string, any> = plan.checkIns || {};
      
      const noShowUids: string[] = [];
      const checkedInUids: string[] = [];
      const batch = db.batch();

      for (const uid of participants) {
        const userRef = db.collection("users").doc(uid);
        const isCheckedIn = !!checkIns[uid];

        if (isCheckedIn) {
          checkedInUids.push(uid);
          // Award Show-up Credit
          batch.update(userRef, {
            trustBalance: admin.firestore.FieldValue.increment(5),
            completedPlans: admin.firestore.FieldValue.increment(1),
          });
        } else {
          noShowUids.push(uid);
          // Apply No-Show Penalty
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            const user = userSnap.data()!;
            const currentScore = user.guestScore ?? 50;
            const newNoShowCount = (user.noShowCount || 0) + 1;
            
            const updates: any = {
              trustBalance: admin.firestore.FieldValue.increment(-10),
              guestScore: Math.max(0, currentScore - 10),
              noShowCount: newNoShowCount,
            };

            if (newNoShowCount >= 3) {
              const suspendUntil = new Date();
              suspendUntil.setDate(suspendUntil.getDate() + 7);
              updates.suspendedUntil = admin.firestore.Timestamp.fromDate(suspendUntil);
            }
            batch.update(userRef, updates);
          }
        }
      }

      // Finalize the plan
      batch.update(doc.ref, {
        noShowUids,
        attendanceMarked: true,
        noShowMarkedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      logger.info(`Auto-finalized attendance for plan ${doc.id}. ${checkedInUids.length} credited, ${noShowUids.length} penalized.`);
    }
  }
);