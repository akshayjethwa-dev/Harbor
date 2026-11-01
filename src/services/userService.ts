// src/services/userService.ts
import { db, storage } from "../lib/firebase";
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
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
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

/**
 * General update function to save text fields.
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<GarbaCrewUser>
): Promise<void> {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────
// Photo Uploads
// ─────────────────────────────────────────────
/**
 * Allows the user to pick an image from their gallery, upload it to Firebase Storage,
 * and append it to their profile's `photos` array.
 */
export async function addProfilePhoto(uid: string): Promise<string | null> {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Please allow access to your photos.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return null;

    const uri = result.assets[0].uri;
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Create reference
    const storageRef = ref(storage, `users/${uid}/photos/${Date.now()}.jpg`);
    
    // ✅ Added contentType metadata to ensure Firebase Storage handles it as an image
    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
    const downloadUrl = await getDownloadURL(storageRef);

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const updates: any = {
        photos: arrayUnion(downloadUrl),
      };
      
      if (!userData.photoUrl) {
        updates.photoUrl = downloadUrl;
      }
      
      await updateDoc(userRef, updates);
    }

    return downloadUrl;
  } catch (error: any) {
    console.error("Error uploading photo:", error);
    Alert.alert("Upload failed", error.message || "Check your storage rules.");
    return null;
  }
}

/**
 * Removes a photo from the user's `photos` array.
 * If the removed photo is the primary `photoUrl`, it promotes the next available photo.
 */
export async function removeProfilePhoto(uid: string, photoUrl: string): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data() as GarbaCrewUser;
    const updates: any = {
      photos: arrayRemove(photoUrl),
    };

    if (userData.photoUrl === photoUrl) {
      const remainingPhotos = (userData.photos || []).filter((p) => p !== photoUrl);
      updates.photoUrl = remainingPhotos.length > 0 ? remainingPhotos[0] : null;
    }

    await updateDoc(userRef, updates);
  } catch (error: any) {
    console.error("Error removing photo:", error);
    Alert.alert("Error", "Could not remove photo. Please try again.");
  }
}

// ─────────────────────────────────────────────
// Task 1: General Availability
// ─────────────────────────────────────────────
export async function updateUserAvailability(
  uid: string,
  availability: AvailabilityMap,
  timeBlockRanges: TimeBlockRanges,
  timezone: string,
  utcOffsetMinutes: number
): Promise<void> {
  const docRef = doc(db, "users", uid);

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

// ─────────────────────────────────────────────
// Task 4: Update City
// ─────────────────────────────────────────────
export async function updateUserCity(uid: string, city: string): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { 
      city,
      updatedAt: serverTimestamp() 
    });
  } catch (error) {
    console.error('Error updating city:', error);
    throw new Error('Could not update location. Please try again.');
  }
}