// functions/src/sosAlerts.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

// Initialize Twilio (Requires Twilio Account SID, Auth Token, and Phone Number)
// You must set these using: firebase functions:config:set twilio.sid="..." twilio.token="..." twilio.phone="+1..."
const twilio = require("twilio");
const twilioClient = process.env.TWILIO_SID && process.env.TWILIO_TOKEN 
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN) 
  : null;

interface Contact {
  name: string;
  phone: string;
}

async function sendTwilioAlerts(alertId: string, alertData: any) {
  if (!twilioClient) {
    logger.error("Twilio credentials not configured. Cannot send SOS.");
    return;
  }

  const userUid = alertData.uid;
  const contactsSnap = await db.collection("users").doc(userUid).collection("emergencyContacts").doc("default").get();
  
  if (!contactsSnap.exists) return;
  const contacts: Contact[] = contactsSnap.data()?.contacts || [];

  if (contacts.length === 0) {
    logger.warn(`User ${userUid} triggered SOS but has no emergency contacts.`);
    return;
  }

  const locationText = alertData.latitude && alertData.longitude
    ? `Location: https://maps.google.com/?q=${alertData.latitude},${alertData.longitude}`
    : "Location could not be determined.";

  for (const contact of contacts) {
    const messageBody = `🚨 SOS ALERT from ${alertData.userName}. They need help! ${locationText}`;

    // 1. Send SMS
    try {
      await twilioClient.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE,
        to: contact.phone,
      });
      logger.info(`SMS sent to ${contact.phone}`);
    } catch (e) {
      logger.error(`Failed to send SMS to ${contact.phone}`, e);
    }

    // 2. Trigger Voice Call (Text-to-Speech)
    try {
      await twilioClient.calls.create({
        twiml: `<Response><Say voice="alice">Emergency alert from ${alertData.userName}. Please check your messages for their location. This is an automated call from Harbor.</Say></Response>`,
        from: process.env.TWILIO_PHONE,
        to: contact.phone,
      });
      logger.info(`Voice call initiated to ${contact.phone}`);
    } catch (e) {
      logger.error(`Failed to trigger call to ${contact.phone}`, e);
    }
  }

  // Mark as alerted in DB
  await db.collection("sosAlerts").doc(alertId).update({
    lastAlertedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// 1. Instant Trigger on SOS Creation
export const onSOSAlertCreated = onDocumentCreated("sosAlerts/{alertId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const alertData = snap.data();
  
  // Only trigger if it's in the 'triggered' state
  if (alertData.status !== "triggered") return;

  await sendTwilioAlerts(event.params.alertId, alertData);
});

// 2. Auto-Alert if not resolved in 5 minutes
export const autoAlertStaleSOS = onSchedule(
  { schedule: "every 5 minutes", timeZone: "UTC" },
  async () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const staleAlerts = await db.collection("sosAlerts")
      .where("status", "==", "triggered")
      .where("autoAlertSent", "==", false)
      .where("createdAt", "<=", fiveMinsAgo)
      .get();

    if (staleAlerts.empty) return;

    for (const doc of staleAlerts.docs) {
      const data = doc.data();
      logger.warn(`Auto-alerting stale SOS for user ${data.uid}`);
      
      // Send a second round of alerts
      await sendTwilioAlerts(doc.id, data);
      
      // Mark as auto-alerted
      await doc.ref.update({ autoAlertSent: true });
    }
  }
);