// functions/src/collect.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

export const expireCollectRequests = onSchedule(
  { schedule: "0 * * * *", timeZone: "UTC" }, // Runs every hour
  async () => {
    const now = admin.firestore.Timestamp.now();
    
    // Find active requests that have passed their expiration date
    const snap = await db.collectionGroup("collectRequests")
      .where("status", "==", "active")
      .where("expiresAt", "<=", now)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    
    snap.forEach((doc) => {
      batch.update(doc.ref, { status: "expired" });
    });

    await batch.commit();
    logger.info(`Expired ${snap.size} collect requests.`);
  }
);