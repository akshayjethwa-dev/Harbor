// functions/src/expenseDisputes.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

// 1. Auto-Resolve after 7 days
export const autoResolveDisputes = onSchedule(
  { schedule: "0 2 * * *", timeZone: "UTC" }, // Daily at 2 AM UTC
  async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snap = await db.collectionGroup("expenses")
      .where("isFrozen", "==", true)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    let count = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      const disputes = data.disputes || [];
      
      const hasStaleDispute = disputes.some((d: any) => 
        d.status === "pending" && d.createdAt.toDate() < sevenDaysAgo
      );

      if (hasStaleDispute) {
        // Auto-resolve in favor of disputer -> Delete expense
        batch.delete(doc.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      logger.info(`Auto-resolved ${count} disputes in favor of disputers.`);
    }
  }
);

// 2. Apply Strike if dispute is marked as false
export const onDisputeResolved = onDocumentUpdated("plans/{planId}/expenses/{expenseId}", async (event) => {
  if (!event.data) return;
  
  const before = event.data.before.data();
  const after = event.data.after.data();

  const beforeDisputes = before.disputes || [];
  const afterDisputes = after.disputes || [];

  // Find newly marked false disputes
  afterDisputes.forEach((newD: any) => {
    if (newD.isFalse) {
      const oldD = beforeDisputes.find((d: any) => d.id === newD.id);
      if (oldD && !oldD.isFalse) {
        // Apply strike to the disputer!
        const strikeRef = db.collection("strikes").doc();
        strikeRef.set({
          uid: newD.raisedByUid,
          reason: "False expense dispute",
          planId: event.params.planId,
          expenseId: event.params.expenseId,
          active: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.warn(`Applied strike to ${newD.raisedByUid} for false dispute.`);
      }
    }
  });
});