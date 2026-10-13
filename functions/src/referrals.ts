import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

const REFERRAL_BONUS = 10;
const MAX_REFERRALS_PER_USER = 20;

/**
 * Generates (or returns) a stable referral code for the caller.
 * Called once on first visit to the referral screen.
 */
export const getOrCreateReferralCode = onCall(
  { invoker: "public", region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const existing = userSnap.data()!.referralCode;
    if (existing) {
      return { code: existing };
    }

    // Generate a unique short code
    let code = "";
    for (let i = 0; i < 5; i++) {
      code = crypto
        .randomBytes(4)
        .toString("hex")
        .slice(0, 6)
        .toUpperCase();
      const clash = await db
        .collection("users")
        .where("referralCode", "==", code)
        .limit(1)
        .get();
      if (clash.empty) break;
      code = "";
    }
    if (!code) {
      throw new HttpsError("internal", "Could not generate code");
    }

    await userRef.update({ referralCode: code });
    return { code };
  }
);

/**
 * Redeems a referral code. Called right after sign-up.
 * Awards +10 Trust Balance to both users.
 */
export const redeemReferralCode = onCall(
  { invoker: "public", region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    const { code } = request.data as { code: string };

    if (!code || typeof code !== "string") {
      throw new HttpsError("invalid-argument", "Code required");
    }

    const normalized = code.trim().toUpperCase();

    const selfRef = db.collection("users").doc(uid);
    const selfSnap = await selfRef.get();
    if (!selfSnap.exists) {
      throw new HttpsError("not-found", "Your user doc not found");
    }
    const self = selfSnap.data()!;

    if (self.referredBy) {
      throw new HttpsError(
        "already-exists",
        "You've already redeemed a referral code"
      );
    }
    if (self.referralCode === normalized) {
      throw new HttpsError(
        "invalid-argument",
        "You can't redeem your own code"
      );
    }

    const referrerSnap = await db
      .collection("users")
      .where("referralCode", "==", normalized)
      .limit(1)
      .get();
    if (referrerSnap.empty) {
      throw new HttpsError("not-found", "Invalid referral code");
    }

    const referrer = referrerSnap.docs[0];
    const referrerData = referrer.data();
    const referralCount = referrerData.referralCount ?? 0;

    if (referralCount >= MAX_REFERRALS_PER_USER) {
      throw new HttpsError(
        "resource-exhausted",
        "This code has hit its referral limit"
      );
    }

    // Award both users
    const batch = db.batch();
    batch.update(selfRef, {
      trustBalance: FieldValue.increment(REFERRAL_BONUS),
      referredBy: referrer.id,
      referredAt: FieldValue.serverTimestamp(),
    });
    batch.update(referrer.ref, {
      trustBalance: FieldValue.increment(REFERRAL_BONUS),
      referralCount: FieldValue.increment(1),
    });
    await batch.commit();

    logger.info(
      `Referral: ${referrer.id} → ${uid}, +${REFERRAL_BONUS} each`
    );

    return {
      ok: true,
      bonus: REFERRAL_BONUS,
      referrerName: referrerData.name ?? "Someone",
    };
  }
);