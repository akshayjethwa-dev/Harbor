// src/services/photoService.ts
import { db, storage } from "../lib/firebase"; // Ensure storage is exported from lib/firebase
import {
  collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import * as ImageManipulator from "expo-image-manipulator";
import { PlanPhoto } from "../types/photo";
import { GarbaCrewUser } from "../types/user";

const photosRef = (planId: string) => collection(db, "plans", planId, "photos");

export function subscribeToPhotos(
  planId: string,
  callback: (photos: PlanPhoto[]) => void
) {
  const q = query(photosRef(planId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, planId, ...d.data() } as PlanPhoto)));
  });
}

export async function uploadPlanPhoto(
  planId: string,
  user: GarbaCrewUser,
  originalUri: string,
  fileName: string
): Promise<void> {
  // 1. Compress & Resize Image
  const manipResult = await ImageManipulator.manipulateAsync(
    originalUri,
    [{ resize: { width: 1200 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 2. Prepare Storage Reference
  const fileId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const storagePath = `plans/${planId}/photos/${fileId}.jpg`;
  const storageRef = ref(storage, storagePath);

  // 3. Upload to Firebase Storage
  const response = await fetch(manipResult.uri);
  const blob = await response.blob();
  
  const uploadTask = await uploadBytesResumable(storageRef, blob);
  const downloadUrl = await getDownloadURL(uploadTask.ref);

  // 4. Save metadata to Firestore
  await addDoc(photosRef(planId), {
    planId,
    url: downloadUrl,
    storagePath,
    uploaderUid: user.uid,
    uploaderName: user.name || "Unknown",
    uploaderPhotoUrl: user.photoUrl || null,
    fileName,
    fileSize: blob.size,
    width: manipResult.width,
    height: manipResult.height,
    isReported: false,
    createdAt: serverTimestamp(),
  });
}

export async function deletePlanPhoto(photo: PlanPhoto): Promise<void> {
  // 1. Delete from Storage
  try {
    const storageRef = ref(storage, photo.storagePath);
    await deleteObject(storageRef);
  } catch (e) {
    console.warn("Storage delete failed (may already be gone):", e);
  }
  
  // 2. Delete from Firestore
  await deleteDoc(doc(db, "plans", photo.planId, "photos", photo.id));
}

export async function reportPlanPhoto(planId: string, photoId: string): Promise<void> {
  await updateDoc(doc(db, "plans", planId, "photos", photoId), {
    isReported: true,
  });
}