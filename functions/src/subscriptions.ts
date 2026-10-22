// functions/src/subscriptions.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import Stripe from "stripe";

const db = admin.firestore();

// Safely initialize Stripe to prevent deployment crashes if the key is missing
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16" as any,
    });
    logger.info("Stripe initialized successfully.");
  } else {
    logger.warn("STRIPE_SECRET_KEY not found in environment variables. Subscription features will be mocked.");
  }
} catch (e) {
  logger.error("Failed to initialize Stripe:", e);
}

/**
 * Task 40/54: Checkout Session (Prorated upgrades)
 */
export const createCheckoutSession = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe is not configured on the server.");
  
  const { tier } = request.data; // "plus" | "pro" | "host"

  const priceMap: Record<string, string> = {
    plus: process.env.STRIPE_PRICE_PLUS || "",
    pro: process.env.STRIPE_PRICE_PRO || "",
    host: process.env.STRIPE_PRICE_HOST || "",
  };

  const priceId = priceMap[tier];
  if (!priceId) {
    throw new HttpsError("invalid-argument", `Invalid tier or price not configured: ${tier}`);
  }

  const userSnap = await db.collection("users").doc(request.auth.uid).get();
  const subSnap = await db.collection("subscriptions").doc(request.auth.uid).get();

  if (!userSnap.exists) throw new HttpsError("not-found", "User not found");
  const user = userSnap.data()!;
  const sub = subSnap.exists ? subSnap.data()! : null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email || undefined,
    customer: sub?.stripeCustomerId || undefined,
    client_reference_id: request.auth.uid,
    success_url: "https://harbor.app/wallet?success=true",
    cancel_url: "https://harbor.app/wallet?canceled=true",
    subscription_data: {
      metadata: { uid: request.auth.uid, tier },
    },
  });

  return { url: session.url };
});

export const cancelSubscription = onCall(async (request) => {
  const { uid } = request.data;
  const subSnap = await db.collection("subscriptions").doc(uid).get();
  if (!subSnap.exists) throw new Error("No subscription found");

  const sub = subSnap.data();
  if (!sub) throw new Error("Subscription data missing");

  if (sub.stripeSubscriptionId && stripe) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  await subSnap.ref.update({ cancelAtPeriodEnd: true });
  return { success: true };
});

export const resumeSubscription = onCall(async (request) => {
  const { uid } = request.data;
  const subSnap = await db.collection("subscriptions").doc(uid).get();
  if (!subSnap.exists) throw new Error("No subscription found");

  const sub = subSnap.data();
  if (!sub) throw new Error("Subscription data missing");

  if (sub.stripeSubscriptionId && stripe) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  await subSnap.ref.update({ cancelAtPeriodEnd: false });
  return { success: true };
});

export const handlePaymentFailed = onCall(async (request) => {
  const { uid } = request.data;
  const gracePeriodEnds = new Date();
  gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 3);

  await db.collection("subscriptions").doc(uid).update({
    status: "past_due",
    gracePeriodEndsAt: admin.firestore.Timestamp.fromDate(gracePeriodEnds),
  });
  return { success: true };
});

export const processExpiredSubscriptions = onSchedule(
  { schedule: "0 0 * * *", timeZone: "UTC" },
  async () => {
    const now = admin.firestore.Timestamp.now();

    const expiredGrace = await db.collection("subscriptions")
      .where("status", "==", "past_due")
      .where("gracePeriodEndsAt", "<=", now)
      .get();

    const batch = db.batch();
    expiredGrace.forEach((doc) => {
      logger.info(`Downgrading user ${doc.id} due to expired grace period.`);
      batch.update(doc.ref, { tier: "free", status: "canceled" });
    });

    const expiredActive = await db.collection("subscriptions")
      .where("status", "in", ["active", "trialing"])
      .where("cancelAtPeriodEnd", "==", true)
      .where("currentPeriodEnd", "<=", now)
      .get();

    expiredActive.forEach((doc) => {
      logger.info(`Downgrading user ${doc.id} due to expired billing cycle.`);
      batch.update(doc.ref, { tier: "free", status: "canceled" });
    });

    await batch.commit();
  }
);