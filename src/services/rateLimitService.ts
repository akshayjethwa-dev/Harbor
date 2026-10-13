import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../lib/firebase";

const functions = getFunctions(app, "asia-south1");

export interface PlanQuota {
  allowed: boolean;
  dailyUsed: number;
  dailyLimit: number;
  weeklyUsed: number;
  weeklyLimit: number;
  dailyRemaining: number;
  weeklyRemaining: number;
}

export async function getPlanCreationQuota(): Promise<PlanQuota> {
  const fn = httpsCallable(functions, "getPlanCreationQuota");
  return (await fn({})).data as PlanQuota;
}