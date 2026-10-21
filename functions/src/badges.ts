// functions/src/badges.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

export const awardBadges = onDocumentUpdated("users/{userId}", async (event) => {
  if (!event.data) return;
  
  // FIX: Removed unused `before` variable
  const after = event.data.after.data();
  const uid = event.params.userId;

  // If user is banned, we don't process badges
  if (after.isBanned === true) return;

  const currentBadges: string[] = after.badges || [];
  const newBadges: string[] = [];

  // ─── 1. Plan Creation Milestones ───
  const plansCreated = after.plansCreatedCount || 0;
  
  if (plansCreated >= 1 && !currentBadges.includes("first_plan")) {
    newBadges.push("first_plan");
  }
  if (plansCreated >= 10 && !currentBadges.includes("ten_plans")) {
    newBadges.push("ten_plans");
  }
  if (plansCreated >= 100 && !currentBadges.includes("hundred_plans")) {
    newBadges.push("hundred_plans");
  }

  // ─── 2. Squad Creation ───
  if (after.squadsCreatedCount && after.squadsCreatedCount >= 1 && !currentBadges.includes("squad_builder")) {
    newBadges.push("squad_builder");
  }

  // ─── 3. Plans Joined ───
  const plansJoined = after.plansJoined || 0;
  if (plansJoined >= 10 && !currentBadges.includes("frequent_flyer")) {
    newBadges.push("frequent_flyer");
  }

  // ─── 4. Big Spender ───
  const totalSpend = after.totalSpent || 0; 
  if (totalSpend >= 10000 && !currentBadges.includes("big_spender")) {
    newBadges.push("big_spender");
  }

  // ─── Award New Badges ───
  if (newBadges.length > 0) {
    try {
      await db.collection("users").doc(uid).update({
        badges: admin.firestore.FieldValue.arrayUnion(...newBadges),
      });
      logger.info(`Awarded badges to ${uid}:`, newBadges);
    } catch (e) {
      logger.error(`Failed to award badges to ${uid}`, e);
    }
  }
});