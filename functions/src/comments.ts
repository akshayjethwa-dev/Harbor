// functions/src/comments.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

async function sendPush(uid: string, title: string, body: string, data: any) {
  const tokenSnap = await db.collection("deviceTokens").doc(uid).get();
  const token = tokenSnap.exists ? tokenSnap.data()?.token : null;
  if (!token) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token, title, body, data,
        sound: "default", channelId: "default", priority: "high",
      }),
    });
  } catch (e) {
    logger.error("Push send failed", e);
  }
}

export const onCommentCreated = onDocumentCreated("plans/{planId}/comments/{commentId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const comment = snap.data();
  const planId = event.params.planId;

  // 1. Spam Rate Limiting (Max 5 comments per minute)
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentComments = await db.collection(`plans/${planId}/comments`)
    .where("authorUid", "==", comment.authorUid)
    .where("createdAt", ">=", oneMinuteAgo)
    .get();

  if (recentComments.size > 5) {
    // Delete the spam comment immediately
    await snap.ref.delete();
    await sendPush(
      comment.authorUid,
      "Spam Detected",
      "You are commenting too fast. Please wait a moment.",
      { planId }
    );
    return;
  }

  // 2. Parse @Mentions
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions = comment.text.match(mentionRegex);
  
  if (!mentions) return;

  // Get plan participants to map names to UIDs
  const planSnap = await db.collection("plans").doc(planId).get();
  const plan = planSnap.data();
  if (!plan || !plan.participantDetails) return;

  for (const mention of mentions) {
    const mentionedName = mention.substring(1); // remove the @
    
    const matchedUser = plan.participantDetails.find(
      (p: any) => p.name.replace(/\s/g, "").toLowerCase() === mentionedName.toLowerCase()
    );

    if (matchedUser && matchedUser.uid !== comment.authorUid) {
      await sendPush(
        matchedUser.uid,
        "You were mentioned",
        `${comment.authorName} mentioned you: "${comment.text.substring(0, 50)}..."`,
        { planId, type: "mention" }
      );
    }
  }
});