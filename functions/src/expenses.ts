// functions/src/expenses.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
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

export const onParticipantRemoved = onDocumentUpdated("plans/{planId}", async (event) => {
  if (!event.data) return;
  
  const before = event.data.before.data();
  const after = event.data.after.data();
  
  const beforeMembers = before.participants || [];
  const afterMembers = after.participants || [];

  // Find users who were removed
  const removedUsers = beforeMembers.filter((uid: string) => !afterMembers.includes(uid));
  if (removedUsers.length === 0) return;

  const planId = event.params.planId;
  const hostUid = after.hostUid;

  // Fetch all expenses to calculate balances
  const expensesSnap = await db.collection("plans").doc(planId).collection("expenses").get();
  const expenses = expensesSnap.docs.map(d => d.data());

  const netBalances: Record<string, number> = {};
  
  // Initialize removed users
  removedUsers.forEach((uid: string) => netBalances[uid] = 0);

  // Calculate balances just for removed users
  expenses.forEach((exp) => {
    // If removed user paid, they are owed
    if (removedUsers.includes(exp.paidByUid)) {
      netBalances[exp.paidByUid] += exp.amount;
    }
    // If removed user was in the split, they owe
    exp.splitAmong.forEach((split: any) => {
      if (removedUsers.includes(split.uid)) {
        netBalances[split.uid] -= split.amountOwed;
      }
    });
  });

  const unsettledUsers = removedUsers.filter((uid: string) => Math.abs(netBalances[uid]) > 0.01);

  if (unsettledUsers.length > 0 && hostUid) {
    const count = unsettledUsers.length;
    await sendPush(
      hostUid,
      "Unsettled Balance Warning",
      `${count} member(s) left the plan with an unsettled balance. Check the Balances tab.`,
      { planId }
    );
    logger.info("Notified organizer of unsettled leaving users", { planId, count });
  }
});