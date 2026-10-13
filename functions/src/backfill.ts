import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();  

/**
 * One-time backfill: populates `titleLower` on plans and `nameLower` on squads
 * so the global search can use prefix matching.
 *
 * Safe to run multiple times — only updates docs where the field is missing.
 *
 * Recommended use:
 *   1. Call from Firebase Console → Functions → backfillSearchFields → Testing tab
 *   2. After the first successful run, remove the export from index.ts and redeploy
 */
export const backfillSearchFields = onCall(
  { invoker: "public", region: "asia-south1" },
  async (request) => {
    // Allow calls from Firebase Console Testing tab (no auth).
    // When auth IS provided, verify it's an admin.
    if (request.auth) {
      const email = (request.auth.token.email ?? "").toLowerCase();
      const allowed = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      if (!allowed.includes(email)) {
        throw new HttpsError("permission-denied", "Admin only");
      }
    } else {
      logger.warn(
        "backfillSearchFields called without auth — assuming Firebase Console"
      );
    }

    logger.info("Backfill started");

    let plansUpdated = 0;
    let plansSkipped = 0;
    let squadsUpdated = 0;
    let squadsSkipped = 0;
    let usersUpdated = 0;

    // ─── Backfill plans.titleLower ───
    const plansSnap = await db.collection("plans").get();
    logger.info(`Scanning ${plansSnap.size} plans`);

    let plansBatch = db.batch();
    let plansBatchCount = 0;

    for (const doc of plansSnap.docs) {
      const data = doc.data();
      if (!data.title || data.titleLower !== undefined) {
        plansSkipped++;
        continue;
      }
      plansBatch.update(doc.ref, {
        titleLower: String(data.title).trim().toLowerCase(),
      });
      plansBatchCount++;
      plansUpdated++;

      if (plansBatchCount >= 400) {
        await plansBatch.commit();
        plansBatch = db.batch();
        plansBatchCount = 0;
      }
    }
    if (plansBatchCount > 0) {
      await plansBatch.commit();
    }

    // ─── Backfill squads.nameLower ───
    const squadsSnap = await db.collection("squads").get();
    logger.info(`Scanning ${squadsSnap.size} squads`);

    let squadsBatch = db.batch();
    let squadsBatchCount = 0;

    for (const doc of squadsSnap.docs) {
      const data = doc.data();
      if (!data.name || data.nameLower !== undefined) {
        squadsSkipped++;
        continue;
      }
      squadsBatch.update(doc.ref, {
        nameLower: String(data.name).trim().toLowerCase(),
      });
      squadsBatchCount++;
      squadsUpdated++;

      if (squadsBatchCount >= 400) {
        await squadsBatch.commit();
        squadsBatch = db.batch();
        squadsBatchCount = 0;
      }
    }
    if (squadsBatchCount > 0) {
      await squadsBatch.commit();
    }

    // ─── Backfill users.nameLower (in case some are missing) ───
    const usersSnap = await db.collection("users").get();
    logger.info(`Scanning ${usersSnap.size} users`);

    let usersBatch = db.batch();
    let usersBatchCount = 0;

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      if (!data.name || data.nameLower !== undefined) continue;

      usersBatch.update(doc.ref, {
        nameLower: String(data.name).trim().toLowerCase(),
      });
      usersBatchCount++;
      usersUpdated++;

      if (usersBatchCount >= 400) {
        await usersBatch.commit();
        usersBatch = db.batch();
        usersBatchCount = 0;
      }
    }
    if (usersBatchCount > 0) {
      await usersBatch.commit();
    }

    const result = {
      plansUpdated,
      plansSkipped,
      squadsUpdated,
      squadsSkipped,
      usersUpdated,
      totalPlans: plansSnap.size,
      totalSquads: squadsSnap.size,
      totalUsers: usersSnap.size,
    };

    logger.info("Backfill complete", result);
    return result;
  }
);