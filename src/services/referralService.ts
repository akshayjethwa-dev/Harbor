import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../lib/firebase";

const functions = getFunctions(app, "asia-south1");

export async function getOrCreateReferralCode(): Promise<string> {
  const fn = httpsCallable(functions, "getOrCreateReferralCode");
  const res = await fn({});
  return (res.data as { code: string }).code;
}

export async function redeemReferralCode(code: string): Promise<{
  ok: boolean;
  bonus: number;
  referrerName: string;
}> {
  const fn = httpsCallable(functions, "redeemReferralCode");
  const res = await fn({ code });
  return res.data as { ok: boolean; bonus: number; referrerName: string };
}

export function buildReferralUrl(code: string): string {
  return `https://garbacrew.app/r/${code}`;
}

export function buildReferralMessage(code: string, name: string): string {
  return `Join me on GarbaCrew! 🎉\n\nUse my code ${code} when you sign up and we both get +10 Trust Balance.\n\n${buildReferralUrl(code)}`;
}