// functions/src/dataRetention.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

/**
 * 1. Purge Deleted Accounts (Runs daily at 2 AM)
 * Requirement: Deleted accounts purged after 30 days.
 */
export const purgeDeletedAccounts = onSchedule(
  { schedule: "0 2 * * *", timeZone: "UTC" },
  async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);

    // Find users marked as deleted > 30 days ago
    const deletedUsersSnap = await db.collection("users")
      .where("isDeleted", "==", true)
      .where("deletedAt", "<=", cutoffTimestamp)
      .get();

    if (deletedUsersSnap.empty) {
      logger.info("No accounts to purge today.");
      return;
    }

    for (const userDoc of deletedUsersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();

      // Edge Case: Legal Hold
      if (userData.legalHold === true) {
        logger.warn(`Account ${uid} is on legal hold. Skipping purge.`);
        continue;
      }

      // Edge Case: Active Disputes
      const disputesAsFiler = await db.collection("disputes")
        .where("filedByUid", "==", uid)
        .where("outcome", "==", "pending")
        .limit(1)
        .get();
      
      const disputesAsTarget = await db.collection("disputes")
        .where("againstUid", "==", uid)
        .where("outcome", "==", "pending")
        .limit(1)
        .get();

      if (!disputesAsFiler.empty || !disputesAsTarget.empty) {
        logger.warn(`Account ${uid} has active disputes. Delaying purge.`);
        continue;
      }

      logger.info(`Purging data for user: ${uid}`);

      // 1. Delete Auth Account
      try {
        await admin.auth().deleteUser(uid);
      } catch (e: any) {
        if (e.code !== "auth/user-not-found") {
          logger.error(`Failed to delete Auth for ${uid}`, e);
        }
      }

      // 2. Recursive delete of User document and subcollections
      // Note: To delete documents across the whole DB (plans, chats), 
      // you would typically do a collection group query and delete them.
      // For this script, we delete the primary user doc:
      await db.recursiveDelete(userDoc.ref);

      // 3. Anonymize Expenses (7-year tax retention)
      // We don't delete expenses, but we remove the link to the user.
      const expensesSnap = await db.collectionGroup("expenses")
        .where("paidByUid", "==", uid)
        .get();
      
      const batch = db.batch();
      expensesSnap.forEach((doc) => {
        batch.update(doc.ref, {
          paidByUid: "deleted_user",
          paidByName: "Deleted User",
          paidByPhotoUrl: null,
        });
      });
      await batch.commit();

      logger.info(`Successfully purged user ${uid}.`);
    }
  }
);

/**
 * 2. Purge Old Chats (Runs weekly on Sunday at 3 AM)
 * Requirement: Chats retained 1 year.
 */
export const purgeOldChats = onSchedule(
  { schedule: "0 3 * * 0", timeZone: "UTC" },
  async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(oneYearAgo);

    // Query all messages older than 1 year
    const oldMessagesSnap = await db.collectionGroup("messages")
      .where("createdAt", "<=", cutoffTimestamp)
      .limit(500) // Process in batches to avoid memory limits
      .get();

    if (oldMessagesSnap.empty) {
      logger.info("No old chat messages to purge.");
      return;
    }

    const batch = db.batch();
    oldMessagesSnap.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logger.info(`Purged ${oldMessagesSnap.size} chat messages older than 1 year.`);
  }
);