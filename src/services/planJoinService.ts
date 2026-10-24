import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../lib/firebase";
import { GarbaCrewUser } from "../types/user";

const functions = getFunctions(app, "asia-south1");

export async function joinPlan(
  planId: string,
  message?: string
): Promise<{
  status: "joined" | "requested" | "waitlisted";
  warning?: string | null;
}> {
  const fn = httpsCallable(functions, "joinPlan");
  const result = await fn({ planId, message: message ?? "" });
  return result.data as {
    status: "joined" | "requested" | "waitlisted";
    warning?: string | null;
  };
}

export async function leavePlan(planId: string): Promise<{ refunded: boolean }> {
  const fn = httpsCallable(functions, "leavePlan");
  const result = await fn({ planId });
  return result.data as { refunded: boolean };
}

export async function approveJoinRequest(
  planId: string,
  requestUid: string
): Promise<void> {
  const fn = httpsCallable(functions, "approveJoinRequest");
  await fn({ planId, requestUid });
}

export async function declineJoinRequest(
  planId: string,
  requestUid: string,
  reason?: string
): Promise<void> {
  const fn = httpsCallable(functions, "declineJoinRequest");
  await fn({ planId, requestUid, reason: reason ?? "" });
}