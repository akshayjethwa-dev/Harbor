// functions/src/nudges.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

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
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    logger.error("Expo push send threw", e);
  }
}

export const onNudgeRequested = onDocumentCreated(
  "nudgeRequests/{requestId}",
  async (event) => {
    const requestRef = event.data?.ref;
    const request = event.data?.data();
    if (!request || !requestRef) return;

    const { pollId, targetUid, organizerId } = request;

    try {
      // 1. Verify the poll exists and the caller is the organizer
      const pollSnap = await db.collection("polls").doc(pollId).get();
      if (!pollSnap.exists) {
        logger.warn("Nudge failed: poll not found", { pollId });
        await requestRef.delete();
        return;
      }
      const poll = pollSnap.data() as any;
      
      if (poll.organizerId !== organizerId) {
        logger.warn("Nudge failed: unauthorized", { organizerId, pollId });
        await requestRef.delete();
        return;
      }

      // 2. Check Rate Limit (24 hours)
      const nudgeRef = db.collection("polls").doc(pollId).collection("nudges").doc(targetUid);
      const nudgeSnap = await nudgeRef.get();
      
      if (nudgeSnap.exists) {
        const lastSentAt = nudgeSnap.data()?.sentAt;
        if (lastSentAt) {
          const lastMs = lastSentAt.toMillis();
          const nowMs = Date.now();
          const hoursSince = (nowMs - lastMs) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            logger.info("Nudge skipped: rate limited", { targetUid, hoursSince });
            await requestRef.delete();
            return;
          }
        }
      }

      // 3. Check if the user has been banned/suspended in the meantime
      const userSnap = await db.collection("users").doc(targetUid).get();
      if (!userSnap.exists) {
        await requestRef.delete();
        return;
      }
      const user = userSnap.data() as any;
      if (user.isBanned) {
        await requestRef.delete();
        return;
      }
      if (user.suspendedUntil && user.suspendedUntil.toMillis() > Date.now()) {
        await requestRef.delete();
        return;
      }

      // 4. Write the nudge history
      await nudgeRef.set({
        userId: targetUid,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy: organizerId,
      });

      // 5. Send Push Notification
      const tokenSnap = await db.collection("deviceTokens").doc(targetUid).get();
      const token = tokenSnap.exists ? tokenSnap.data()?.token : null;

      if (token) {
        await sendExpoPush([{
          to: token,
          title: "Nudge! 📅",
          body: `The organizer is waiting for your vote on ${poll.planId ? "the date poll" : "a date"}.`,
          data: { type: "poll_created", planId: poll.planId, pollId },
          sound: "default",
          channelId: "polls",
          priority: "high",
        }]);
      }

      // 6. Write In-App Notification
      await db.collection("notifications").add({
        userId: targetUid,
        type: "poll_nudge",
        title: "Nudge from organizer",
        body: "Please vote on the date poll.",
        link: `/plan/${poll.planId}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("Nudge sent successfully", { targetUid, pollId });

    } catch (e) {
      logger.error("onNudgeRequested failed", e);
    } finally {
      // Always clean up the request doc
      await requestRef.delete();
    }
  }
);