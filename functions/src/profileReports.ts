// functions/src/profileReports.ts
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

/**
 * 1. Auto-Suspend Pending Review
 * If a user gets 3+ pending reports, suspend them automatically.
 */
export const onProfileReportCreated = onDocumentCreated("profileReports/{reportId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  
  const data = snap.data();
  const targetUid = data.targetUid;

  const reportsSnap = await db.collection("profileReports")
    .where("targetUid", "==", targetUid)
    .where("status", "==", "pending")
    .get();

  if (reportsSnap.size >= 3) {
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + 7); // 7 day suspension

    const userRef = db.collection("users").doc(targetUid);
    const userSnap = await userRef.get();
    
    if (userSnap.exists && !userSnap.data()?.isBanned) {
      await userRef.update({
        suspendedUntil: admin.firestore.Timestamp.fromDate(suspendUntil),
        isBanned: false, // Pending admin review
      });
      logger.warn(`User ${targetUid} auto-suspended pending review due to ${reportsSnap.size} reports.`);
    }
  }
});

/**
 * 2. Strike False Reporters
 * If an admin marks a report as 'isFalseReport', apply a strike to the reporter.
 */
export const onReportResolved = onDocumentUpdated("profileReports/{reportId}", async (event) => {
  if (!event.data) return;
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Only trigger if the report was just marked as a false report
  if (before.isFalseReport === true || after.isFalseReport !== true) return;

  const reporterUid = after.reporterUid;
  const reporterRef = db.collection("users").doc(reporterUid);

  // Increment strikes
  await reporterRef.update({
    strikes: admin.firestore.FieldValue.increment(1),
  });

  const reporterSnap = await reporterRef.get();
  const strikes = (reporterSnap.data()?.strikes || 0);

  // 3 strikes = reporter gets suspended
  if (strikes >= 3) {
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + 7);
    await reporterRef.update({
      suspendedUntil: admin.firestore.Timestamp.fromDate(suspendUntil),
    });
    logger.warn(`Reporter ${reporterUid} suspended for 7 days due to repeated false reports.`);
  }

  logger.info(`Applied strike to reporter ${reporterUid} for false report.`);
});