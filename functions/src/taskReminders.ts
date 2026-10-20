// functions/src/taskReminders.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
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
        data: { type: "task_reminder", ...data },
        sound: "default",
        channelId: "default",
        priority: "high",
      }),
    });
  } catch (e) {
    logger.error("Push send failed", e);
  }
}

// Helper to check if current time is within DND
function isDND(user: any): boolean {
  const dndStart = user?.reminderSettings?.dndStart ?? 22;
  const dndEnd = user?.reminderSettings?.dndEnd ?? 7;
  const currentHour = new Date().getHours();

  if (dndStart > dndEnd) {
    // e.g., 22 to 7 (overnight)
    return currentHour >= dndStart || currentHour < dndEnd;
  } else {
    // e.g., 13 to 15
    return currentHour >= dndStart && currentHour < dndEnd;
  }
}

// 1. 24h and Due Date Reminders
export const sendTaskDueReminders = onSchedule(
  { schedule: "0 9 * * *", timeZone: "UTC" }, // Runs daily at 9 AM UTC
  async () => {
    const now = new Date();
    
    // Define today and tomorrow bounds
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const endOfToday = new Date(now.setHours(23, 59, 59, 999));
    
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const endOfTomorrow = new Date(endOfToday);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

    // Query tasks due today or tomorrow
    const tasksSnap = await db.collectionGroup("tasks")
      .where("isCompleted", "==", false)
      .where("isArchived", "==", false)
      .where("dueDate", ">=", startOfToday)
      .where("dueDate", "<=", endOfTomorrow)
      .get();

    for (const doc of tasksSnap.docs) {
      const task = doc.data();
      if (!task.assigneeUid) continue;

      const userSnap = await db.collection("users").doc(task.assigneeUid).get();
      const user = userSnap.data();
      
      if (!user || user.reminderSettings?.taskReminders === false) continue;
      if (isDND(user)) {
        // Instead of pushing, we could drop an in-app notification here.
        // For this implementation, we just skip the push.
        continue; 
      }

      const dueMs = task.dueDate.toMillis();
      const isDueToday = dueMs >= startOfToday.getTime() && dueMs <= endOfToday.getTime();
      
      const title = isDueToday ? "Task Due Today" : "Task Due Tomorrow";
      const body = `Don't forget: ${task.title}`;

      await sendPush(task.assigneeUid, title, body, { planId: doc.ref.parent.parent?.id });
    }
  }
);

// 2. Overdue Digest for Organizers
export const sendOverdueTaskDigests = onSchedule(
  { schedule: "0 10 * * *", timeZone: "UTC" }, // Runs daily at 10 AM UTC
  async () => {
    const now = admin.firestore.Timestamp.now();

    // Get all overdue, incomplete tasks
    const tasksSnap = await db.collectionGroup("tasks")
      .where("isCompleted", "==", false)
      .where("isArchived", "==", false)
      .where("dueDate", "<", now)
      .get();

    if (tasksSnap.empty) return;

    // Group tasks by Plan ID
    const tasksByPlan: Record<string, number> = {};
    tasksSnap.forEach((doc) => {
      const planId = doc.ref.parent.parent?.id;
      if (planId) {
        tasksByPlan[planId] = (tasksByPlan[planId] || 0) + 1;
      }
    });

    // Group tasks by Organizer UID
    const organizerDigests: Record<string, { count: number; planIds: string[] }> = {};

    for (const [planId, count] of Object.entries(tasksByPlan)) {
      const planSnap = await db.collection("plans").doc(planId).get();
      if (!planSnap.exists) continue;
      
      const hostUid = planSnap.data()?.hostUid;
      if (!hostUid) continue;

      if (!organizerDigests[hostUid]) {
        organizerDigests[hostUid] = { count: 0, planIds: [] };
      }
      organizerDigests[hostUid].count += count;
      organizerDigests[hostUid].planIds.push(planId);
    }

    // Send 1 push per organizer
    for (const [hostUid, digest] of Object.entries(organizerDigests)) {
      const userSnap = await db.collection("users").doc(hostUid).get();
      const user = userSnap.data();
      
      if (!user || user.reminderSettings?.overdueDigest === false) continue;
      if (isDND(user)) continue;

      await sendPush(
        hostUid,
        "Overdue Tasks Digest",
        `You have ${digest.count} overdue task(s) across ${digest.planIds.length} plan(s).`,
        { planIds: digest.planIds }
      );
    }
  }
);