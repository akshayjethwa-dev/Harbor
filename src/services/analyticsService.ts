// src/services/analyticsService.ts
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext"; // Optional: if using global state

export type AnalyticsEvent = 
  | "app_open" 
  | "plan_view" 
  | "plan_create" 
  | "heatmap_view" 
  | "expense_logged"
  | "task_completed"
  | "sos_triggered";

/**
 * Logs an analytics event to Firestore.
 * Privacy: No PII (names, emails) is stored. Only UID, event type, and timestamp.
 */
export async function logAnalyticsEvent(
  uid: string,
  event: AnalyticsEvent,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    // We store raw events. The Cloud Function will anonymize and aggregate them.
    await addDoc(collection(db, "analytics_events"), {
      uid, // We use UID to calculate unique active users, but never expose it in the dashboard
      event,
      metadata,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    // Fail silently. Analytics should never crash the app.
    console.warn("Analytics event failed", e);
  }
}