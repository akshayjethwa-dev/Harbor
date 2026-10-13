import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

const CHECKIN_WINDOW_MINUTES = 30; // ±30 min around start
const NO_SHOW_GRACE_MINUTES = 45;  // after start

// Haversine distance in km
function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const checkInToPlan = onCall(
  { invoker: "public", region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    const { planId, latitude, longitude } = request.data as {
      planId: string;
      latitude: number;
      longitude: number;
    };

    if (!planId || latitude == null || longitude == null) {
      throw new HttpsError("invalid-argument", "Missing fields");
    }

    const planRef = db.collection("plans").doc(planId);
    const planSnap = await planRef.get();
    if (!planSnap.exists) {
      throw new HttpsError("not-found", "Plan not found");
    }
    const plan = planSnap.data()!;

    if (!plan.participants?.includes(uid)) {
      throw new HttpsError("permission-denied", "Not a participant");
    }

    // Time window check
    const startMs = plan.startTime?.toMillis?.() ?? 0;
    if (!startMs) {
      throw new HttpsError("failed-precondition", "Plan has no start time");
    }
    const nowMs = Date.now();
    const windowMs = CHECKIN_WINDOW_MINUTES * 60 * 1000;
    if (nowMs < startMs - windowMs) {
      throw new HttpsError(
        "failed-precondition",
        "Check-in opens 30 minutes before the Plan starts"
      );
    }
    if (nowMs > startMs + windowMs) {
      throw new HttpsError(
        "failed-precondition",
        "Check-in window has closed"
      );
    }

    // Location check — only if plan has coordinates
    let distance: number | null = null;
    if (plan.latitude != null && plan.longitude != null) {
      distance = distanceKm(
        latitude,
        longitude,
        plan.latitude,
        plan.longitude
      );
      if (distance > 0.5) {
        // 500 m
        throw new HttpsError(
          "failed-precondition",
          `You're ${(distance * 1000).toFixed(0)}m away. Move within 500m to check in.`
        );
      }
    }

    // Record check-in
    await planRef.update({
      [`checkIns.${uid}`]: {
        at: FieldValue.serverTimestamp(),
        latitude,
        longitude,
        distanceMeters: distance != null ? Math.round(distance * 1000) : null,
      },
    });

    logger.info(`Check-in: ${uid} → ${planId}`);

    return { ok: true, distanceMeters: distance != null ? Math.round(distance * 1000) : null };
  }
);

/**
 * Scheduled every 15 minutes: mark participants as no-show if they didn't
 * check in within the grace period after the Plan start time.
 */
export const markNoShows = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const nowMs = Date.now();
    const cutoffMs = nowMs - NO_SHOW_GRACE_MINUTES * 60 * 1000;

    // Plans that started recently and are still "open"/"full"
    const snap = await db
      .collection("plans")
      .where("status", "in", ["open", "full"])
      .where("startTime", "<=", Timestamp.fromMillis(cutoffMs))
      .limit(50)
      .get();

    for (const planDoc of snap.docs) {
      const plan = planDoc.data();
      const checkIns = plan.checkIns ?? {};
      const noShows: string[] = [];

      for (const uid of plan.participants ?? []) {
        if (!checkIns[uid]) {
          noShows.push(uid);
        }
      }

      if (noShows.length === 0) {
        // Everyone checked in — move to completed
        await planDoc.ref.update({
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
        });
        continue;
      }

      // Apply Guest Score penalty to no-shows
      for (const uid of noShows) {
        const userRef = db.collection("users").doc(uid);
        await userRef.update({
          guestScore: FieldValue.increment(-20),
          noShowCount: FieldValue.increment(1),
        });

        // Burn Trust Balance escrow
        await userRef.update({
          escrowBalance: FieldValue.increment(-5),
        });
      }

      await planDoc.ref.update({
        status: "no_show",
        noShowUids: noShows,
        noShowMarkedAt: FieldValue.serverTimestamp(),
      });

      logger.info(
        `Plan ${planDoc.id}: ${noShows.length} no-shows, ${Object.keys(checkIns).length} checked in`
      );
    }
  }
);