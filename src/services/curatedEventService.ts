// src/services/curatedEventService.ts
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plan } from "../types/plan";
import { GarbaCrewUser } from "../types/user";

const HARBOR_SYSTEM_UID = "harbor_system";

export async function joinCuratedEvent(planId: string, user: GarbaCrewUser): Promise<void> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) throw new Error("Event not found");
  const plan = planSnap.data() as Plan;

  if (plan.participants.includes(user.uid)) throw new Error("Already joined");
  if (plan.spotsFilled >= plan.capacity) throw new Error("Event is full");

  await updateDoc(planRef, {
    participants: arrayUnion(user.uid),
    participantDetails: arrayUnion({
      uid: user.uid,
      name: user.name ?? "Someone",
      photoUrl: user.photoUrl ?? null,
      guestScore: user.guestScore ?? 50,
      joinedAt: Timestamp.now(),
      approved: true,
    }),
    spotsFilled: (plan.spotsFilled || 0) + 1,
    status: (plan.spotsFilled + 1 >= plan.capacity) ? "full" : "open",
    updatedAt: serverTimestamp(),
  });

  // Add to chat
  await updateDoc(doc(db, "chats", plan.chatId), {
    participants: arrayUnion(user.uid),
  });

  await setDoc(doc(collection(db, "chats", plan.chatId, "messages")), {
    fromUid: "system",
    fromName: "Harbor",
    fromPhotoUrl: null,
    type: "system",
    text: `${user.name ?? "Someone"} joined the event 👋`,
    imageUrl: null,
    createdAt: serverTimestamp(),
  });
}

export async function repeatCuratedEvent(originalPlanId: string, user: GarbaCrewUser): Promise<string> {
  const originalRef = doc(db, "plans", originalPlanId);
  const originalSnap = await getDoc(originalRef);
  if (!originalSnap.exists()) throw new Error("Original event not found");
  const original = originalSnap.data() as Plan;

  if (!original.isCurated) throw new Error("This is not a curated event");

  // Create a new plan for next week
  const start = new Date(original.startTime.toDate());
  start.setDate(start.getDate() + 7);
  const end = new Date(original.endTime.toDate());
  end.setDate(end.getDate() + 7);

  const newPlanRef = doc(collection(db, "plans"));
  const newPlanId = newPlanRef.id;
  const chatId = `plan_${newPlanId}`;

  await setDoc(newPlanRef, {
    hostUid: HARBOR_SYSTEM_UID,
    hostName: "Harbor Presents",
    hostPhotoUrl: null,
    hostScore: 100,
    hostVerified: true,
    hostStreak: 0,
    hostSubscriptionTier: "host",
    isHostTier: true,
    isCurated: true,
    curatedLabel: "Harbor Presents",
    curatedCategory: original.curatedCategory,
    activity: original.activity,
    activityCustom: original.activityCustom,
    title: original.title,
    description: original.description,
    startTime: Timestamp.fromDate(start),
    endTime: Timestamp.fromDate(end),
    durationMinutes: original.durationMinutes,
    locationName: original.locationName,
    locationAddress: original.locationAddress,
    city: original.city,
    latitude: original.latitude,
    longitude: original.longitude,
    capacity: original.capacity,
    costTotal: 0,
    costPerPerson: 0,
    requirements: original.requirements,
    approvalMode: "auto",
    visibility: "public",
    participants: [user.uid],
    participantDetails: [{
      uid: user.uid,
      name: user.name ?? "Someone",
      photoUrl: user.photoUrl ?? null,
      guestScore: user.guestScore ?? 50,
      joinedAt: Timestamp.now(),
      approved: true,
    }],
    spotsFilled: 1,
    pendingRequests: [],
    waitlist: [],
    chatId,
    lastMessage: null,
    lastMessageAt: null,
    status: "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    sourceTemplateId: original.id,
    facilitatorUid: null,
    facilitatorName: null,
    facilitatorPhotoUrl: null,
  });

  // Create chat
  await setDoc(doc(db, "chats", chatId), {
    type: "plan",
    planId: newPlanId,
    planTitle: original.title,
    participants: [HARBOR_SYSTEM_UID, user.uid],
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(collection(db, "chats", chatId, "messages")), {
    fromUid: "system",
    fromName: "Harbor",
    fromPhotoUrl: null,
    type: "system",
    text: `This is a repeat of the ${original.title} event. Welcome!`,
    imageUrl: null,
    createdAt: serverTimestamp(),
  });

  return newPlanId;
}