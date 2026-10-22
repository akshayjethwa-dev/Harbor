// functions/src/analytics.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

export const aggregateAnalytics = onSchedule(
  { schedule: "0 1 * * *", timeZone: "UTC" }, // Daily at 1 AM
  async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const startOfYesterday = admin.firestore.Timestamp.fromDate(yesterday);
    
    // 1. Fetch raw events from yesterday
    const eventsSnap = await db.collection("analytics_events")
      .where("timestamp", ">=", startOfYesterday)
      .get();

    if (eventsSnap.empty) {
      logger.info("No analytics events to process.");
      return;
    }

    const uniqueUsers = new Set<string>();
    const featureUsage: Record<string, number> = {};
    const funnel = {
      app_opened: 0,
      plan_viewed: 0,
      plan_created: 0,
    };

    eventsSnap.forEach((doc) => {
      const data = doc.data();
      uniqueUsers.add(data.uid);
      
      // Aggregate Feature Usage
      featureUsage[data.event] = (featureUsage[data.event] || 0) + 1;

      // Build Funnel
      if (data.event === "app_open") funnel.app_opened++;
      if (data.event === "plan_view") funnel.plan_viewed++;
      if (data.event === "plan_create") funnel.plan_created++;
    });

    const dau = uniqueUsers.size;
    const dateStr = yesterday.toISOString().split("T")[0];

    // Privacy Protection: K-Anonymity
    const isPrivacyProtected = dau < 5;

    // 2. Save Anonymized Metrics
    await db.collection("admin_analytics").doc(dateStr).set({
      date: dateStr,
      dau: isPrivacyProtected ? -1 : dau, // -1 denotes "Protected"
      featureUsage: isPrivacyProtected ? {} : featureUsage,
      funnel: isPrivacyProtected ? {} : funnel,
      isPrivacyProtected,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Calculate MAU (Simplified: run a 30-day query)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // FIX: Removed the unused `startOf30Days` variable
    
    const mauSnap = await db.collection("admin_analytics")
      .where("date", ">=", thirtyDaysAgo.toISOString().split("T")[0])
      .where("dau", ">", 0)
      .get();
    
    // Update MAU in a separate doc (latest summary)
    let mau = 0;
    if (!mauSnap.empty) {
      mauSnap.forEach(d => mau += d.data().dau);
    }

    await db.collection("admin_analytics").doc("latest_summary").set({
      mauProxy: mau,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Delete raw events (Privacy & Storage)
    const batch = db.batch();
    eventsSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    logger.info(`Processed analytics for ${dateStr}. DAU: ${isPrivacyProtected ? "Protected" : dau}`);
  }
);