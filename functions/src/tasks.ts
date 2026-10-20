// functions/src/tasks.ts
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
        to: token,
        title,
        body,
        data: { type: "task_update", ...data },
        sound: "default",
        channelId: "default",
        priority: "high",
      }),
    });
  } catch (e) {
    logger.error("Push send failed", e);
  }
}

// Replace your existing onTaskAssigned with this updated version:

export const onTaskAssigned = onDocumentUpdated("plans/{planId}/tasks/{taskId}", async (event) => {
  if (!event.data) return;
  const before = event.data.before.data();
  const after = event.data.after.data();
  
  if (before.assigneeUid === after.assigneeUid) return; // Not an assignment change

  const taskTitle = after.title;
  const planId = event.params.planId;

  // Check if this was a self-claim (went from null to a value, and claimedAt exists)
  const isSelfClaim = !before.assigneeUid && after.assigneeUid && after.claimedAt;

  // Notify the NEW assignee (unless they claimed it themselves)
  if (after.assigneeUid && !isSelfClaim) {
    await sendPush(
      after.assigneeUid,
      "New Task Assigned",
      `You have been assigned: ${taskTitle}`,
      { planId }
    );
  }

  // Notify the OLD assignee (if it was a reassignment)
  if (before.assigneeUid && before.assigneeUid !== after.assigneeUid) {
    await sendPush(
      before.assigneeUid,
      "Task Reassigned",
      `You are no longer assigned to: ${taskTitle}`,
      { planId }
    );
  }

  // Notify the ORGANIZER if a member self-claimed the task
  if (isSelfClaim) {
    const planSnap = await db.collection("plans").doc(planId).get();
    const hostUid = planSnap.data()?.hostUid;
    if (hostUid) {
      await sendPush(
        hostUid,
        "Task Claimed",
        `${after.assigneeName} claimed: ${taskTitle}`,
        { planId }
      );
    }
  }
});

// 2. Task Declined (AssigneeUid changed to null, but we need to know who declined)
export const onTaskDeclined = onDocumentUpdated("plans/{planId}/tasks/{taskId}", async (event) => {
  if (!event.data) return;
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Detect if it went from assigned -> null (could be decline or manual unassign)
  if (before.assigneeUid && !after.assigneeUid) {
    const planSnap = await db.collection("plans").doc(event.params.planId).get();
    const hostUid = planSnap.data()?.hostUid;

    if (hostUid) {
      await sendPush(
        hostUid,
        "Task Unassigned/Declined",
        `${before.assigneeName} is no longer assigned to: ${after.title}`,
        { planId: event.params.planId }
      );
    }
  }
});

// 3. Assignee leaves plan / banned (Plan participants array changes)
export const onPlanMembersUpdated = onDocumentUpdated("plans/{planId}", async (event) => {
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

  // Find tasks assigned to the removed users
  const tasksSnap = await db.collection("plans").doc(planId).collection("tasks")
    .where("assigneeUid", "in", removedUsers.slice(0, 10)) // Firestore limit
    .get();

  if (tasksSnap.empty) return;

  const batch = db.batch();
  let unassignedCount = 0;

  tasksSnap.forEach((doc) => {
    batch.update(doc.ref, {
      assigneeUid: null,
      assigneeName: null,
      assigneePhotoUrl: null,
    });
    unassignedCount++;
  });

  await batch.commit();

  // Notify organizer
  if (hostUid) {
    await sendPush(
      hostUid,
      "Tasks Auto-Unassigned",
      `${unassignedCount} task(s) were unassigned because a member left the plan.`,
      { planId }
    );
  }
});