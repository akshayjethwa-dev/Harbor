// src/services/streakService.ts
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../lib/firebase";

const functions = getFunctions(app, "asia-south1");

export async function useStreakFreeze(): Promise<void> {
  const freezeFn = httpsCallable(functions, "useStreakFreeze");
  await freezeFn({});
}