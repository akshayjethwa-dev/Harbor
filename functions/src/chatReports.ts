// functions/src/chatReports.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

export const onChatReportCreated = onDocumentCreated("chatReports/{reportId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const report = snap.data();
  
  const { reporterUid, contextType, contextId, offenderUid, offenderName } = report;

  // 1. Rate Limiting (Max 3 reports per hour per user)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentReports = await db.collection("chatReports")
    .where("reporterUid", "==", reporterUid)
    .where("createdAt", ">=", oneHourAgo)
    .get();

  if (recentReports.size > 3) {
    logger.warn(`Rate limit hit for reporter ${reporterUid}. Auto-dismissing report.`);
    await snap.ref.update({ status: "dismissed", autoDismissedReason: "rate_limit" });
    return;
  }

  // 2. Fetch context data
  const contextRef = db.collection(contextType === "plan" ? "plans" : "squads").doc(contextId);
  const contextSnap = await contextRef.get();
  if (!contextSnap.exists) return;
  const contextData = contextSnap.data();

  let targetManagerUid = "";
  if (contextType === "plan") {
    targetManagerUid = contextData?.hostUid; // Plan organizer
  } else if (contextType === "squad") {
    targetManagerUid = contextData?.adminUid; // Squad admin
  }

  // 3. Check if the Offender IS the Manager (Escalation edge case)
  const isOffenderManager = offenderUid === targetManagerUid;

  // 4. Create Admin Alert
  const adminAlertData: any = {
    type: "chat_report",
    reportId: event.params.reportId,
    contextType,
    contextId,
    offenderUid,
    offenderName,
    reporterUid,
    reason: report.reason,
    details: report.details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isEscalated: isOffenderManager, // Super-admins should prioritize this
  };

  await db.collection("adminAlerts").add(adminAlertData);

  // 5. Notify the Organizer (if they are not the offender)
  if (!isOffenderManager && targetManagerUid) {
    // Send push notification to organizer
    const managerTokens = await db.collection("deviceTokens").doc(targetManagerUid).get();
    const token = managerTokens.data()?.token;
    
    if (token) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            to: token,
            title: "Chat Report",
            body: `A message from ${offenderName} was reported in your ${contextType}. Admins are reviewing.`,
            data: { type: "chat_report", contextId },
          }),
        });
      } catch (e) {
        logger.error("Push send failed", e);
      }
    }
  }

  logger.info(`Chat report processed. Escalated: ${isOffenderManager}`);
});