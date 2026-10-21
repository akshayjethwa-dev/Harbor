// src/services/reportService.ts
import { db } from "../lib/firebase";
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { ProfileReport, ChatReport } from "../types/report"; // <-- Both imported here
import { GarbaCrewUser } from "../types/user";
import { ChatMessage } from "../types/plan"; 

/**
 * Submit a report against a user profile.
 */
export async function reportProfile(
  target: GarbaCrewUser,
  reporter: GarbaCrewUser,
  reason: ProfileReport["reason"],
  details?: string
): Promise<void> {
  await addDoc(collection(db, "profileReports"), {
    targetUid: target.uid,
    targetName: target.name || "Unknown",
    reporterUid: reporter.uid,
    reporterName: reporter.name || "Unknown",
    reason,
    details: details || "",
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

/**
 * Admin action: Resolve a report.
 * If marked as false, the Cloud Function will apply a strike to the reporter.
 */
export async function resolveProfileReport(
  reportId: string,
  action: "dismiss" | "confirm_ban",
  isFalseReport: boolean = false
): Promise<void> {
  const reportRef = doc(db, "profileReports", reportId);
  
  await updateDoc(reportRef, {
    status: action === "dismiss" ? "dismissed" : "reviewed",
    isFalseReport,
    resolvedAt: serverTimestamp(),
  });
}

/**
 * Task 38: Report a chat message for harassment.
 */
export async function reportChatMessage(
  message: ChatMessage,
  contextType: "plan" | "squad",
  contextId: string,
  chatId: string,
  reporter: GarbaCrewUser,
  reason: ChatReport["reason"], // <-- Type usage is now safe
  details?: string
): Promise<void> {
  await addDoc(collection(db, "chatReports"), {
    contextType,
    contextId,
    messageId: message.id,
    messageText: message.text || "[Media/Image]",
    chatId,
    
    offenderUid: message.fromUid,
    offenderName: message.fromName,
    
    reporterUid: reporter.uid,
    reporterName: reporter.name || "Unknown",
    
    reason,
    details: details || "",
    screenshotUrl: "", // In a real app, you'd upload the screenshot to storage first
    
    status: "pending",
    createdAt: serverTimestamp(),
  });
}