// src/services/safetyService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch, // <-- Added for bulk save
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as Location from "expo-location"; 
import { db, storage } from "../lib/firebase";
import { GarbaCrewUser } from "../types/user";
import {
  Block,
  Dispute,
  EmergencyContact,
  LiveLocation,
  Report,
  ReportReason,
  ReportTargetType,
  SOSEvent,
  SOS_DURATION_MS,
  LIVE_LOCATION_DURATION_MS,
  MAX_EMERGENCY_CONTACTS,
  Strike,
} from "../types/safety";

// ─────────────────────────────────────────────────────────
// Task 39: Location Helper with Fallback
// ─────────────────────────────────────────────────────────
export async function getSOSLocation(): Promise<{ lat: number | null, lng: number | null, acc: number | null, isLastKnown: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("Permission denied");

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude, acc: loc.coords.accuracy ?? null, isLastKnown: false };
  } catch (e) {
    console.warn("Could not get current location, trying last known...", e);
    try {
      const lastLoc = await Location.getLastKnownPositionAsync();
      if (lastLoc) {
        return { lat: lastLoc.coords.latitude, lng: lastLoc.coords.longitude, acc: lastLoc.coords.accuracy ?? null, isLastKnown: true };
      }
    } catch (fallbackErr) {
      console.warn("No last known location available.");
    }
    return { lat: null, lng: null, acc: null, isLastKnown: true };
  }
}

// ─────────────────────────────────────────────────────────
// SOS
// ─────────────────────────────────────────────────────────
export async function triggerSOS({
  me,
  latitude,
  longitude,
  accuracy,
  isLastKnownLocation,
  chatId,
  planId,
  squadId,
  message,
}: {
  me: GarbaCrewUser;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isLastKnownLocation: boolean; 
  chatId?: string;
  planId?: string;
  squadId?: string;
  message?: string;
}): Promise<string> {
  const sosRef = doc(collection(db, "sosEvents"));
  const sosId = sosRef.id;

  const contacts = await getEmergencyContacts(me.uid);
  const contactPhones = contacts.map((c) => c.phone);

  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + SOS_DURATION_MS)
  );

  await setDoc(sosRef, {
    uid: me.uid,
    userName: me.name ?? "Someone",
    userPhone: me.phone ?? null,
    planId: planId ?? null,
    squadId: squadId ?? null,
    chatId: chatId ?? null,
    latitude,
    longitude,
    locationAccuracy: accuracy,
    isLastKnownLocation, 
    status: "active",
    message: message ?? "",
    respondedBy: [],
    emergencyContactsNotified: contactPhones,
    autoAlertSent: false, 
    createdAt: serverTimestamp(),
    expiresAt,
  });

  return sosId;
}

export async function cancelSOS(sosId: string): Promise<void> {
  await updateDoc(doc(db, "sosEvents", sosId), {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
  });
}

export async function acknowledgeSOS(sosId: string, uid: string): Promise<void> {
  const sosRef = doc(db, "sosEvents", sosId);
  const snap = await getDoc(sosRef);
  if (!snap.exists()) return;

  const data = snap.data() as SOSEvent;
  if (data.respondedBy.includes(uid)) return;

  await updateDoc(sosRef, {
    respondedBy: [...data.respondedBy, uid],
  });
}

export async function getActiveSOSForScope(
  scopeType: "plan" | "squad",
  scopeId: string
): Promise<SOSEvent | null> {
  const field = scopeType === "plan" ? "planId" : "squadId";
  const q = query(
    collection(db, "sosEvents"),
    where(field, "==", scopeId),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as SOSEvent;
}

// ─────────────────────────────────────────────────────────
// Live Location
// ─────────────────────────────────────────────────────────
export async function startLiveLocation({
  me,
  scopeType,
  scopeId,
  latitude,
  longitude,
  accuracy,
}: {
  me: GarbaCrewUser;
  scopeType: "plan" | "squad" | "match";
  scopeId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
}): Promise<void> {
  const id = `${me.uid}_${scopeId}`;
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + LIVE_LOCATION_DURATION_MS)
  );

  await setDoc(doc(db, "liveLocations", id), {
    uid: me.uid,
    userName: me.name ?? "Someone",
    scopeType,
    scopeId,
    latitude,
    longitude,
    accuracy,
    updatedAt: serverTimestamp(),
    expiresAt,
  });
}

export async function updateLiveLocation(
  me: GarbaCrewUser,
  scopeId: string,
  latitude: number,
  longitude: number,
  accuracy: number | null
): Promise<void> {
  const id = `${me.uid}_${scopeId}`;
  const ref = doc(db, "liveLocations", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await updateDoc(ref, {
    latitude,
    longitude,
    accuracy,
    updatedAt: serverTimestamp(),
  });
}

export async function stopLiveLocation(
  uid: string,
  scopeId: string
): Promise<void> {
  const id = `${uid}_${scopeId}`;
  await deleteDoc(doc(db, "liveLocations", id));
}

// ─────────────────────────────────────────────────────────
// Emergency Contacts
// ─────────────────────────────────────────────────────────
export async function getEmergencyContacts(
  uid: string
): Promise<EmergencyContact[]> {
  const snap = await getDocs(
    query(collection(db, "users", uid, "emergencyContacts"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyContact));
}

export async function addEmergencyContact(
  uid: string,
  contact: Omit<EmergencyContact, "id">
): Promise<string> {
  const existing = await getEmergencyContacts(uid);
  if (existing.length >= MAX_EMERGENCY_CONTACTS) {
    throw new Error(`Maximum ${MAX_EMERGENCY_CONTACTS} emergency contacts.`);
  }

  const ref = doc(collection(db, "users", uid, "emergencyContacts"));
  await setDoc(ref, {
    name: contact.name.trim(),
    phone: contact.phone.trim(),
    relationship: contact.relationship?.trim() ?? "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeEmergencyContact(
  uid: string,
  contactId: string
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "emergencyContacts", contactId));
}

/**
 * Task 39: Bulk save emergency contacts (replaces existing)
 */
export async function saveEmergencyContacts(
  uid: string,
  contacts: EmergencyContact[]
): Promise<void> {
  const batch = writeBatch(db);
  const colRef = collection(db, "users", uid, "emergencyContacts");
  
  // 1. Delete existing contacts
  const existingSnap = await getDocs(query(colRef));
  existingSnap.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  // 2. Add the new contacts
  contacts.forEach((c) => {
    const newRef = doc(colRef, c.id);
    batch.set(newRef, {
      name: c.name.trim(),
      phone: c.phone.trim(),
      relationship: c.relationship?.trim() ?? "",
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

// ─────────────────────────────────────────────────────────
// Block User
// ─────────────────────────────────────────────────────────
export async function blockUser(
  me: GarbaCrewUser,
  target: { uid: string; name: string; photoUrl: string | null },
  reason?: string
): Promise<void> {
  const id = `${me.uid}_${target.uid}`;
  await setDoc(doc(db, "blocks", id), {
    blockerUid: me.uid,
    blockedUid: target.uid,
    blockedName: target.name,
    blockedPhotoUrl: target.photoUrl,
    reason: reason ?? "",
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(meUid: string, targetUid: string): Promise<void> {
  const id = `${meUid}_${targetUid}`;
  await deleteDoc(doc(db, "blocks", id));
}

export async function getMyBlocks(uid: string): Promise<Block[]> {
  const snap = await getDocs(
    query(collection(db, "blocks"), where("blockerUid", "==", uid))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Block));
}

export async function getBlockedUids(uid: string): Promise<string[]> {
  const blocks = await getMyBlocks(uid);
  return blocks.map((b) => b.blockedUid);
}

export async function isBlockedBy(
  potentialBlockerUid: string,
  meUid: string
): Promise<boolean> {
  const id = `${potentialBlockerUid}_${meUid}`;
  const snap = await getDoc(doc(db, "blocks", id));
  return snap.exists();
}

// ─────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────
export async function submitReport({
  me,
  targetType,
  targetId,
  targetOwnerUid,
  reason,
  details,
  evidenceFiles,
}: {
  me: GarbaCrewUser;
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerUid?: string;
  reason: ReportReason;
  details: string;
  evidenceFiles?: string[]; 
}): Promise<string> {
  const evidenceUrls: string[] = [];
  if (evidenceFiles && evidenceFiles.length > 0) {
    for (let i = 0; i < evidenceFiles.length; i++) {
      const uri = evidenceFiles[i];
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(
        storage,
        `reports/${me.uid}/${Date.now()}_${i}.jpg`
      );
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      evidenceUrls.push(url);
    }
  }

  const reportRef = doc(collection(db, "reports"));
  await setDoc(reportRef, {
    reporterUid: me.uid,
    reporterName: me.name ?? "Someone",
    targetType,
    targetId,
    targetOwnerUid: targetOwnerUid ?? "",
    reason,
    details: details.trim(),
    evidenceUrls,
    status: "open",
    createdAt: serverTimestamp(),
  });

  return reportRef.id;
}

// ─────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────
export async function fileDispute({
  me,
  planId,
  planTitle,
  againstUid,
  againstName,
  reason,
  amount,
  evidenceFiles,
}: {
  me: GarbaCrewUser;
  planId: string;
  planTitle: string;
  againstUid: string;
  againstName: string;
  reason: string;
  amount: number;
  evidenceFiles?: string[];
}): Promise<string> {
  const evidenceUrls: string[] = [];
  if (evidenceFiles && evidenceFiles.length > 0) {
    for (let i = 0; i < evidenceFiles.length; i++) {
      const response = await fetch(evidenceFiles[i]);
      const blob = await response.blob();
      const storageRef = ref(
        storage,
        `disputes/${me.uid}/${Date.now()}_${i}.jpg`
      );
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      evidenceUrls.push(url);
    }
  }

  const disputeRef = doc(collection(db, "disputes"));
  await setDoc(disputeRef, {
    planId,
    planTitle,
    filedByUid: me.uid,
    filedByName: me.name ?? "Someone",
    againstUid,
    againstName,
    reason: reason.trim(),
    evidenceUrls,
    amount,
    outcome: "pending",
    createdAt: serverTimestamp(),
  });

  return disputeRef.id;
}

export async function getMyDisputes(uid: string): Promise<Dispute[]> {
  const q = query(
    collection(db, "disputes"),
    where("filedByUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Dispute));
}

// ─────────────────────────────────────────────────────────
// Strikes
// ─────────────────────────────────────────────────────────
export async function getMyStrikes(uid: string): Promise<Strike[]> {
  const q = query(
    collection(db, "strikes"),
    where("uid", "==", uid),
    where("active", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Strike));
}