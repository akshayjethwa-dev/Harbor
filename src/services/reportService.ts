// src/services/reportService.ts
import { db } from "../lib/firebase";
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  increment 
} from "firebase/firestore";
import { ProfileReport } from "../types/report";
import { GarbaCrewUser } from "../types/user";

/**
 * Submit a report against a user.
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
 * If marked as false, apply a strike to the reporter.
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

  // If it's a false report, the Cloud Function will handle striking the reporter.
}