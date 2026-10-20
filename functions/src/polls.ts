// functions/src/polls.ts
/**
 * Date Polls Cloud Functions
 * - onPollCreated: notifies plan members when a new date poll is created.
 * - onPollConfirmed: notifies members when a slot is locked in.
 * - expireStalePolls: scheduled; expires polls past their closesAt and
 *   notifies organizers when a poll expired with zero votes.
 */
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

// ─────────────────────────────────────────────
// Expo Push helper (self-contained)
// ─────────────────────────────────────────────
interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: "default" | null;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      logger.warn("Expo push send failed", { status: res.status });
    }
  } catch (e) {
    logger.error("Expo push send threw", e);
  }
}

/** Look up device tokens for a set of user IDs. */
async function getTokensForUsers(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // Firestore `in` queries cap at 10 items — chunk accordingly.
  const CHUNK = 10;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const slice = userIds.slice(i, i + CHUNK);
    const snaps = await Promise.all(
      slice.map((uid) => db.collection("deviceTokens").doc(uid).get())
    );
    snaps.forEach((snap, idx) => {
      if (snap.exists) {
        const token = (snap.data() as any)?.token;
        if (token) map.set(slice[idx], token);
      }
    });
  }
  return map;
}

/** Send a push to every user in the list (except `excludeUserId`). */
async function notifyUsers(
  userIds: string[],
  excludeUserId: string | null,
  payload: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
    channelId?: string;
  }
): Promise<void> {
  const targets = userIds.filter((id) => id && id !== excludeUserId);
  if (targets.length === 0) return;

  const tokens = await getTokensForUsers(targets);
  const messages: ExpoPushMessage[] = [];
  tokens.forEach((token) => {
    messages.push({
      to: token,
      title: payload.title,
      body: payload.body,
      data: { type: payload.type, ...(payload.data ?? {}) },
      sound: "default",
      channelId: payload.channelId ?? "default",
      priority: "high",
    });
  });
  await sendExpoPush(messages);
}

// ─────────────────────────────────────────────
// onPollCreated — notify plan members
// ─────────────────────────────────────────────
export const onPollCreated = onDocumentCreated(
  "polls/{pollId}",
  async (event) => {
    const pollId = event.params.pollId;
    const poll = event.data?.data();
    if (!poll) return;

    const { planId, organizerId } = poll as {
      planId: string;
      organizerId: string;
    };

    try {
      const planSnap = await db.collection("plans").doc(planId).get();
      if (!planSnap.exists) {
        logger.warn("onPollCreated: plan not found", { planId, pollId });
        return;
      }
      const plan = planSnap.data() as any;

      const memberIds: string[] =
        plan.participants ?? plan.memberIds ?? [];
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        logger.info("onPollCreated: no members to notify", { planId, pollId });
        return;
      }

      await notifyUsers(memberIds, organizerId, {
        title: "New date poll",
        body: "Vote on the proposed dates to pick the best time.",
        type: "poll_created",
        data: { planId, pollId },
        channelId: "polls",
      });

      logger.info("onPollCreated: notified members", {
        pollId,
        count: memberIds.length,
      });
    } catch (e) {
      logger.error("onPollCreated failed", e);
    }
  }
);

// ─────────────────────────────────────────────
// onPollConfirmed — notify members when a slot is locked in
// ─────────────────────────────────────────────
export const onPollConfirmed = onDocumentUpdated(
  "polls/{pollId}",
  async (event) => {
    if (!event.data) return;
    
    const before = event.data.before.data() as any;
    const after = event.data.after.data() as any;
    const pollId = event.params.pollId;

    // Check if the status changed to "closed" AND a slot was confirmed
    const justConfirmed =
      before.status === "open" &&
      after.status === "closed" &&
      after.confirmedSlotId &&
      before.confirmedSlotId !== after.confirmedSlotId;

    if (!justConfirmed) return;

    const { planId, organizerId, confirmedSlotId, slots } = after;

    try {
      const planSnap = await db.collection("plans").doc(planId).get();
      if (!planSnap.exists) return;
      const plan = planSnap.data() as any;

      const memberIds: string[] = plan.participants ?? plan.memberIds ?? [];
      if (memberIds.length === 0) return;

      // Find the confirmed slot to format the date for the notification
      const confirmedSlot = slots.find((s: any) => s.id === confirmedSlotId);
      let dateString = "a new date";
      
      if (confirmedSlot) {
        // Simple format for the push notification
        const d = confirmedSlot.startAt.toDate();
        dateString = d.toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }

      await notifyUsers(memberIds, organizerId, {
        title: "Plan date confirmed! 📅",
        body: `The organizer locked in ${dateString}. See you there!`,
        type: "poll_closed",
        data: { planId, pollId },
        channelId: "polls",
      });

      logger.info("onPollConfirmed: notified members", {
        pollId,
        count: memberIds.length,
      });
    } catch (e) {
      logger.error("onPollConfirmed failed", e);
    }
  }
);

// ─────────────────────────────────────────────
// expireStalePolls — scheduled daily at 03:00 UTC
// ─────────────────────────────────────────────
export const expireStalePolls = onSchedule(
  { schedule: "0 3 * * *", timeZone: "UTC" },
  async () => {
    const now = admin.firestore.Timestamp.now();

    const staleSnap = await db
      .collection("polls")
      .where("status", "==", "open")
      .where("closesAt", "<=", now)
      .get();

    if (staleSnap.empty) {
      logger.info("expireStalePolls: nothing to do");
      return;
    }

    const batch = db.batch();
    const notifyJobs: Promise<void>[] = [];

    staleSnap.forEach((docSnap) => {
      const poll = docSnap.data() as any;
      const voteCounts: Record<string, { yes: number; maybe: number; no: number }> =
        poll.voteCounts ?? {};
      const totalVotes = Object.values(voteCounts).reduce(
        (sum, c) => sum + (c.yes ?? 0) + (c.maybe ?? 0) + (c.no ?? 0),
        0
      );

      batch.update(docSnap.ref, {
        status: "expired",
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Clear the plan's pending poll pointer, mark date pending
      const planRef = db.collection("plans").doc(poll.planId);
      batch.update(planRef, {
        pendingDatePollId: null,
        dateStatus: "pending",
      });

      // If no one voted, notify the organizer
      if (totalVotes === 0 && poll.organizerId) {
        notifyJobs.push(
          notifyUsers([poll.organizerId], null, {
            title: "Your date poll expired",
            body: "No votes were cast. Consider creating a new poll.",
            type: "poll_expired_no_votes",
            data: { planId: poll.planId, pollId: docSnap.id },
            channelId: "polls",
          })
        );
      }
    });

    await batch.commit();
    await Promise.all(notifyJobs);

    logger.info("expireStalePolls: done", { count: staleSnap.size });
  }
);