import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

const TRUST_JOIN_STAKE = -5;
const TRUST_BLOCK_JOIN = 5;
const REQUEST_AUTO_DECLINE_HOURS = 48;

// ─────────────────────────────────────────────────────────
// Story 3.4 + 3.5: Join a Plan
// ─────────────────────────────────────────────────────────
export const joinPlan = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in");
  const uid = request.auth.uid;
  const { planId, message } = request.data as {
    planId: string;
    message?: string;
  };

  if (!planId) throw new HttpsError("invalid-argument", "planId required");

  const planRef = db.collection("plans").doc(planId);
  const userRef = db.collection("users").doc(uid);

  // Read both in a transaction
  const result = await db.runTransaction(async (tx: Transaction) => {
    const [planSnap, userSnap] = await Promise.all([
      tx.get(planRef),
      tx.get(userRef),
    ]);

    if (!planSnap.exists) throw new HttpsError("not-found", "Plan not found");
    if (!userSnap.exists) throw new HttpsError("not-found", "User not found");

    const plan = planSnap.data()!;
    const user = userSnap.data()!;

    // ─── Guards ───
    if (plan.hostUid === uid) {
      throw new HttpsError("failed-precondition", "You're the host");
    }
    if (plan.status !== "open" && plan.status !== "full") {
      throw new HttpsError("failed-precondition", "Plan is no longer open");
    }
    if ((plan.participants ?? []).includes(uid)) {
      throw new HttpsError("already-exists", "You're already a participant");
    }
    if ((plan.pendingRequests ?? []).some((r: any) => r.uid === uid)) {
      throw new HttpsError("already-exists", "Request already pending");
    }

    // Trust Balance check
    const balance = user.trustBalance ?? 50;
    if (balance < TRUST_BLOCK_JOIN) {
      throw new HttpsError(
        "failed-precondition",
        `Trust Balance too low (${balance}). Minimum ${TRUST_BLOCK_JOIN} required.`
      );
    }

    // Requirements
    const req = plan.requirements ?? {};
    if (req.verifiedOnly && !user.isVerified) {
      throw new HttpsError(
        "failed-precondition",
        "This Plan requires a verified profile"
      );
    }
    if (req.womenOnly && user.gender !== "female") {
      throw new HttpsError("failed-precondition", "This Plan is women-only");
    }
    if (
      req.minGuestScore != null &&
      (user.guestScore ?? 50) < req.minGuestScore
    ) {
      throw new HttpsError(
        "failed-precondition",
        `Minimum Guest Score: ${req.minGuestScore}`
      );
    }

    const isPaid = (plan.costTotal ?? 0) > 0;
    const isManual =
      plan.approvalMode === "manual" || plan.approvalMode === "paid_manual";

    // Paid plans use Razorpay (Sprint 5), not this flow
    if (isPaid) {
      throw new HttpsError(
        "failed-precondition",
        "This is a paid Plan. Payment flow not yet available."
      );
    }

    // Manual approval → create a pending request
    if (isManual) {
      const autoDeclineAt = Timestamp.fromDate(
        new Date(Date.now() + REQUEST_AUTO_DECLINE_HOURS * 60 * 60 * 1000)
      );

      const requestEntry = {
        uid,
        name: user.name ?? "Someone",
        photoUrl: user.photoUrl ?? null,
        guestScore: user.guestScore ?? 50,
        isVerified: user.isVerified ?? false,
        age: user.age ?? null,
        bio: user.bio ?? "",
        message: (message ?? "").slice(0, 300),
        requestedAt: FieldValue.serverTimestamp(),
        autoDeclineAt,
      };

      tx.update(planRef, {
        pendingRequests: FieldValue.arrayUnion(requestEntry),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { status: "requested" as const, warning: null };
    }

    // Auto-approve → check capacity
    if (plan.capacity > 0 && (plan.spotsFilled ?? 0) >= plan.capacity) {
      // Full → waitlist
      tx.update(planRef, {
        waitlist: FieldValue.arrayUnion(uid),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        status: "waitlisted" as const,
        warning: "Plan is full — you're on the waitlist.",
      };
    }

    // Stake trust balance
    const newBalance = Math.max(0, balance + TRUST_JOIN_STAKE);
    tx.update(userRef, {
      trustBalance: newBalance,
      escrowBalance: FieldValue.increment(5),
    });

    // Escrow record
    const escrowRef = db.collection("escrow").doc();
    tx.set(escrowRef, {
      uid,
      planId,
      amount: 5,
      status: "held",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Add to participants
    const newParticipant = {
      uid,
      name: user.name ?? "Someone",
      photoUrl: user.photoUrl ?? null,
      guestScore: user.guestScore ?? 50,
      joinedAt: Timestamp.now(),
      approved: true,
    };

    const newSpotsFilled = (plan.spotsFilled ?? 0) + 1;
    const newStatus =
      plan.capacity > 0 && newSpotsFilled >= plan.capacity ? "full" : "open";

    tx.update(planRef, {
      participants: FieldValue.arrayUnion(uid),
      participantDetails: FieldValue.arrayUnion(newParticipant),
      spotsFilled: newSpotsFilled,
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { status: "joined" as const, warning: null };
  });

  // After transaction: add to chat + system message
  if (result.status === "joined") {
    const planSnap = await planRef.get();
    const plan = planSnap.data()!;
    const chatRef = db.collection("chats").doc(plan.chatId);

    await chatRef.update({
      participants: FieldValue.arrayUnion(uid),
    });

    await chatRef.collection("messages").add({
      fromUid: "system",
      fromName: "Harbor",
      fromPhotoUrl: null,
      type: "system",
      text: `${(await userRef.get()).data()?.name ?? "Someone"} joined 👋`,
      imageUrl: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    await planRef.update({
      lastMessageAt: FieldValue.serverTimestamp(),
    });
  }

  return result;
});

// ─────────────────────────────────────────────────────────
// Story 3.10: Leave a Plan (participant)
// ─────────────────────────────────────────────────────────
export const leavePlan = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in");
  const uid = request.auth.uid;
  const { planId } = request.data as { planId: string };

  const planRef = db.collection("plans").doc(planId);
  const userRef = db.collection("users").doc(uid);

  const result = await db.runTransaction(async (tx: Transaction) => {
    const [planSnap, userSnap] = await Promise.all([
      tx.get(planRef),
      tx.get(userRef),
    ]);

    if (!planSnap.exists) throw new HttpsError("not-found", "Plan not found");
    const plan = planSnap.data()!;
    const user = userSnap.exists ? userSnap.data()! : null;

    if (plan.hostUid === uid) {
      throw new HttpsError(
        "failed-precondition",
        "Hosts must cancel the Plan instead of leaving"
      );
    }
    if (!(plan.participants ?? []).includes(uid)) {
      // Handle pending request case
      if ((plan.pendingRequests ?? []).some((r: any) => r.uid === uid)) {
        const cleaned = (plan.pendingRequests ?? []).filter(
          (r: any) => r.uid !== uid
        );
        tx.update(planRef, {
          pendingRequests: cleaned,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { refunded: false };
      }
      // Handle waitlist case
      if ((plan.waitlist ?? []).includes(uid)) {
        tx.update(planRef, {
          waitlist: (plan.waitlist ?? []).filter((u: string) => u !== uid),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { refunded: false };
      }
      throw new HttpsError("failed-precondition", "You're not in this Plan");
    }

    // Refund Trust Balance escrow (5 back)
    if (user) {
      tx.update(userRef, {
        trustBalance: Math.min(100, (user.trustBalance ?? 50) + 5),
        escrowBalance: FieldValue.increment(-5),
      });
    }

    // Remove from participants
    const newDetails = (plan.participantDetails ?? []).filter(
      (p: any) => p.uid !== uid
    );
    const newSpots = Math.max(0, (plan.spotsFilled ?? 1) - 1);
    const newStatus =
      plan.capacity > 0 && newSpots < plan.capacity ? "open" : plan.status;

    tx.update(planRef, {
      participants: (plan.participants ?? []).filter((u: string) => u !== uid),
      participantDetails: newDetails,
      spotsFilled: newSpots,
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { refunded: true };
  });

  // Remove from chat
  if (result.refunded) {
    const planSnap = await planRef.get();
    const plan = planSnap.data()!;
    const chatRef = db.collection("chats").doc(plan.chatId);
    await chatRef.update({
      participants: FieldValue.arrayRemove(uid),
    });

    await chatRef.collection("messages").add({
      fromUid: "system",
      fromName: "Harbor",
      fromPhotoUrl: null,
      type: "system",
      text: `${(await userRef.get()).data()?.name ?? "Someone"} left the Plan`,
      imageUrl: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return result;
});

// ─────────────────────────────────────────────────────────
// Story 3.5: Host approves a pending request
// ─────────────────────────────────────────────────────────
export const approveJoinRequest = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in");
  const hostUid = request.auth.uid;
  const { planId, requestUid } = request.data as {
    planId: string;
    requestUid: string;
  };

  const planRef = db.collection("plans").doc(planId);
  const requestUserRef = db.collection("users").doc(requestUid);

  const result = await db.runTransaction(async (tx: Transaction) => {
    const [planSnap, userSnap] = await Promise.all([
      tx.get(planRef),
      tx.get(requestUserRef),
    ]);

    if (!planSnap.exists) throw new HttpsError("not-found", "Plan not found");
    const plan = planSnap.data()!;

    if (plan.hostUid !== hostUid) {
      throw new HttpsError("permission-denied", "Only the host can approve");
    }

    const request = (plan.pendingRequests ?? []).find(
      (r: any) => r.uid === requestUid
    );
    if (!request) {
      throw new HttpsError("not-found", "Request not found");
    }

    if (plan.capacity > 0 && (plan.spotsFilled ?? 0) >= plan.capacity) {
      throw new HttpsError("failed-precondition", "Plan is full");
    }

    if (!userSnap.exists) throw new HttpsError("not-found", "User not found");
    const user = userSnap.data()!;

    // Stake trust balance
    tx.update(requestUserRef, {
      trustBalance: Math.max(0, (user.trustBalance ?? 50) + TRUST_JOIN_STAKE),
      escrowBalance: FieldValue.increment(5),
    });

    // Escrow
    const escrowRef = db.collection("escrow").doc();
    tx.set(escrowRef, {
      uid: requestUid,
      planId,
      amount: 5,
      status: "held",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Move from pendingRequests to participants
    const newRequests = (plan.pendingRequests ?? []).filter(
      (r: any) => r.uid !== requestUid
    );
    const newParticipant = {
      uid: request.uid,
      name: request.name,
      photoUrl: request.photoUrl,
      guestScore: request.guestScore,
      joinedAt: Timestamp.now(),
      approved: true,
    };
    const newSpots = (plan.spotsFilled ?? 0) + 1;
    const newStatus =
      plan.capacity > 0 && newSpots >= plan.capacity ? "full" : "open";

    tx.update(planRef, {
      pendingRequests: newRequests,
      participants: FieldValue.arrayUnion(requestUid),
      participantDetails: FieldValue.arrayUnion(newParticipant),
      spotsFilled: newSpots,
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { plan };
  });

  // Add to chat + system message
  const chatRef = db.collection("chats").doc(result.plan.chatId);
  await chatRef.update({ participants: FieldValue.arrayUnion(requestUid) });
  await chatRef.collection("messages").add({
    fromUid: "system",
    fromName: "Harbor",
    fromPhotoUrl: null,
    type: "system",
    text: `Request approved 👋`,
    imageUrl: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  logger.info(`Host ${hostUid} approved ${requestUid} for plan ${planId}`);
});

// ─────────────────────────────────────────────────────────
// Story 3.5: Host declines a pending request
// ─────────────────────────────────────────────────────────
export const declineJoinRequest = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in");
  const hostUid = request.auth.uid;
  const { planId, requestUid, reason } = request.data as {
    planId: string;
    requestUid: string;
    reason?: string;
  };

  const planRef = db.collection("plans").doc(planId);
  const snap = await planRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Plan not found");
  const plan = snap.data()!;

  if (plan.hostUid !== hostUid) {
    throw new HttpsError("permission-denied", "Only the host can decline");
  }

  const newRequests = (plan.pendingRequests ?? []).filter(
    (r: any) => r.uid !== requestUid
  );

  await planRef.update({
    pendingRequests: newRequests,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info(
    `Host ${hostUid} declined ${requestUid} for plan ${planId}${
      reason ? `: ${reason}` : ""
    }`
  );
});

// ─────────────────────────────────────────────────────────
// Scheduled: auto-decline stale requests (>48h)
// ─────────────────────────────────────────────────────────
export const autoDeclineStaleRequests = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const now = Timestamp.now();
    const snap = await db
      .collection("plans")
      .where("status", "in", ["open", "full"])
      .get();

    for (const planDoc of snap.docs) {
      const plan = planDoc.data();
      const requests: any[] = plan.pendingRequests ?? [];
      const stale = requests.filter((r) => {
        const at = (r.autoDeclineAt as Timestamp)?.toMillis?.() ?? 0;
        return at > 0 && at < now.toMillis();
      });
      if (stale.length === 0) continue;

      const kept = requests.filter(
        (r) => !stale.some((s) => s.uid === r.uid)
      );
      await planDoc.ref.update({
        pendingRequests: kept,
        updatedAt: FieldValue.serverTimestamp(),
      });
      logger.info(
        `Auto-declined ${stale.length} stale requests for plan ${planDoc.id}`
      );
    }
  }
);