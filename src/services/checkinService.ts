import * as Location from "expo-location";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../lib/firebase";

const functions = getFunctions(app, "asia-south1");

export interface CheckInResult {
  ok: boolean;
  distanceMeters: number | null;
}

export async function checkInToPlan(planId: string): Promise<CheckInResult> {
  // Get permission
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== "granted") {
    throw new Error(
      "Location permission required. Enable it in settings to check in."
    );
  }

  // Get position
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const fn = httpsCallable(functions, "checkInToPlan");
  const res = await fn({
    planId,
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  });
  return res.data as CheckInResult;
}

/**
 * Returns the check-in window state for a Plan.
 */
export function getCheckInState(
  plan: { startTime: any; checkIns?: Record<string, any> },
  uid: string
): {
  canCheckIn: boolean;
  alreadyCheckedIn: boolean;
  reason?: string;
  windowLabel?: string;
} {
  const startMs = plan.startTime?.toMillis?.() ?? 0;
  if (!startMs) return { canCheckIn: false, alreadyCheckedIn: false, reason: "No start time" };

  const now = Date.now();
  const windowMs = 30 * 60 * 1000;
  const already = !!plan.checkIns?.[uid];

  if (already) {
    return { canCheckIn: false, alreadyCheckedIn: true };
  }
  if (now < startMs - windowMs) {
    const mins = Math.round((startMs - now) / 60000);
    return {
      canCheckIn: false,
      alreadyCheckedIn: false,
      reason: `Check-in opens in ${mins} min`,
    };
  }
  if (now > startMs + windowMs) {
    return {
      canCheckIn: false,
      alreadyCheckedIn: false,
      reason: "Check-in window closed",
    };
  }
  return { canCheckIn: true, alreadyCheckedIn: false };
}