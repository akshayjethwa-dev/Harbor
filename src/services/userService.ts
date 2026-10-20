// src/services/userService.ts
import { db } from "../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  documentId,
} from "firebase/firestore";
import {
  GarbaCrewUser,
  AvailabilityMap,
  TimeBlockRanges,
} from "../types/user";

// ─────────────────────────────────────────────
// Profile scoring
// ─────────────────────────────────────────────
export function computeProfileScore(data: {
  photoUri?: string | null;
  photoUrl?: string | null;
  name?: string;
  age?: number | null;
  gender?: string | null;
  city?: string;
  languages?: string[];
  activities?: string[];
  danceSkill?: string | null;
  vibeScore?: number;
  bio?: string;
  favoriteActivitySong?: string;
  postActivityRitual?: string;
}): number {
  let score = 0;
  if (data.photoUri || data.photoUrl) score += 10;
  if (data.name?.trim()) score += 10;
  if (data.age && data.age >= 18) score += 5;
  if (data.gender) score += 5;
  if (data.city) score += 5;
  if (data.languages && data.languages.length > 0) score += 5;
  if (data.activities && data.activities.length >= 2) score += 10;
  else if (data.activities && data.activities.length === 1) score += 5;
  if (data.danceSkill) score += 10;
  if (data.vibeScore !== undefined && data.vibeScore !== 5) score += 5;
  if (data.bio?.trim()) score += 5;
  if (data.favoriteActivitySong?.trim()) score += 5;
  if (data.postActivityRitual?.trim()) score += 5;
  return Math.min(score, 100);
}

export function getProfileTips(score: number): string[] {
  const tips: string[] = [];
  if (score < 50)
    tips.push("Your profile is incomplete. Add more details to be more discoverable.");
  if (score < 70) tips.push("Add a bio to tell others about yourself.");
  if (score < 85)
    tips.push("Complete your dance skill and vibe preferences.");
  if (score < 100) tips.push("Verify your identity to get a verified badge.");
  return tips;
}

export async function getUserProfile(
  uid: string
): Promise<GarbaCrewUser | null> {
  const docRef = doc(db, "users", uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) return { uid, ...snap.data() } as GarbaCrewUser;
  return null;
}

// ─────────────────────────────────────────────
// Task 1: General Availability
// ─────────────────────────────────────────────

/**
 * Persist the user's recurring weekly availability + their custom
 * time-block ranges to Firestore.
 */
export async function updateUserAvailability(
  uid: string,
  availability: AvailabilityMap,
  timeBlockRanges: TimeBlockRanges,
  timezone: string,
  utcOffsetMinutes: number
): Promise<void> {
  const docRef = doc(db, "users", uid);

  // Strip undefined values — Firestore rejects them.
  const cleanMap: AvailabilityMap = {};
  for (const [key, value] of Object.entries(availability)) {
    if (value !== undefined && value !== null) {
      cleanMap[key as keyof AvailabilityMap] = value;
    }
  }

  const cleanRanges: TimeBlockRanges = {};
  if (timeBlockRanges) {
    for (const [key, value] of Object.entries(timeBlockRanges)) {
      if (
        value &&
        typeof value.startHour === "number" &&
        typeof value.endHour === "number"
      ) {
        cleanRanges[key as keyof TimeBlockRanges] = value;
      }
    }
  }

  await updateDoc(docRef, {
    availability: cleanMap,
    timeBlockRanges: cleanRanges,
    availabilityTimezone: timezone,
    availabilityUtcOffsetMinutes: utcOffsetMinutes,
    availabilityUpdatedAt: serverTimestamp(),
  });
}

/**
 * Remove all availability — explicitly sets the field to an empty map,
 * which the UI interprets as "unknown" (not "busy").
 */
export async function clearUserAvailability(uid: string): Promise<void> {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
    availability: {},
    availabilityUpdatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────
// Task 3: Batch fetch users by UID list
// ─────────────────────────────────────────────
/**
 * Fetch multiple user docs by UID. Firestore caps `in` at 10 items per
 * query, so we chunk. Safe to call with 0, 1, or 100+ UIDs.
 */
export async function getUsersByIds(
  uids: string[]
): Promise<GarbaCrewUser[]> {
  if (!uids || uids.length === 0) return [];
  const CHUNK = 10;
  const results: GarbaCrewUser[] = [];

  for (let i = 0; i < uids.length; i += CHUNK) {
    const slice = uids.slice(i, i + CHUNK);
    const q = query(
      collection(db, "users"),
      where(documentId(), "in", slice)
    );
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      results.push({ uid: docSnap.id, ...docSnap.data() } as GarbaCrewUser);
    });
  }
  return results;
}