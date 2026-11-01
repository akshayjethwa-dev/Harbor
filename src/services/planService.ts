// src/services/planService.ts
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch, // <-- Added for bulk updates
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Plan, PlanDraft, PlanJoinRequest } from "../types/plan";
import { GarbaCrewUser } from "../types/user";

// ─────────────────────────────────────────────────────────
// Create Plan
// ─────────────────────────────────────────────────────────
export async function createPlan(
  host: GarbaCrewUser,
  draft: PlanDraft
): Promise<string> {
  if (!draft.activity) throw new Error("Activity is required");
  if (!draft.title.trim()) throw new Error("Title is required");
  if (!draft.startDate || !draft.startTime) throw new Error("Date/time is required");
  if (!draft.city) throw new Error("City is required");

  const [hh, mm] = draft.startTime.split(":").map(Number);
  const start = new Date(draft.startDate);
  start.setHours(hh, mm, 0, 0);
  if (start.getTime() < Date.now()) {
    throw new Error("Plan start time must be in the future");
  }

  const end = new Date(start.getTime() + draft.durationMinutes * 60 * 1000);
  const costPerPerson = draft.capacity > 0 ? Math.round(draft.costTotal / draft.capacity) : 0;

  const plansRef = collection(db, "plans");
  const newPlanRef = doc(plansRef);
  const planId = newPlanRef.id;
  const chatId = `plan_${planId}`;

  const planDoc = {
    hostUid: host.uid,
    hostName: host.name ?? "Someone",
    hostPhotoUrl: host.photoUrl ?? null,
    hostScore: host.hostScore ?? 50,
    hostVerified: host.isVerified ?? false,
    hostStreak: host.streak ?? 0,
    hostSubscriptionTier: host.subscriptionTier || "free",
    isHostTier: host.subscriptionTier === "host",
    activity: draft.activity,
    activityCustom: draft.activityCustom || "",
    title: draft.title.trim(),
    titleLower: draft.title.trim().toLowerCase(),
    description: draft.description.trim(),
    startTime: Timestamp.fromDate(start),
    endTime: Timestamp.fromDate(end),
    durationMinutes: draft.durationMinutes,
    locationName: draft.locationName.trim(),
    locationAddress: draft.locationAddress?.trim() || "",
    city: draft.city,
    latitude: draft.latitude || null,
    longitude: draft.longitude || null,
    capacity: draft.capacity,
    costTotal: draft.costTotal,
    costPerPerson,
    requiresWaiver: draft.requiresWaiver || false,
    requirements: draft.requirements,
    approvalMode: draft.approvalMode,
    visibility: draft.visibility,
    participants: [],
    participantDetails: [],
    spotsFilled: 0,
    pendingRequests: [],
    waitlist: [],
    chatId,
    lastMessage: null,
    lastMessageAt: null,
    status: "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newPlanRef, planDoc);

  // Create empty chat doc
  await setDoc(doc(db, "chats", chatId), {
    type: "plan",
    planId,
    planTitle: draft.title.trim(),
    participants: [host.uid],
    createdAt: serverTimestamp(),
  });

  // Welcome system message
  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: "system",
    fromName: "Crew",
    fromPhotoUrl: null,
    type: "system",
    text: `${host.name ?? "Host"} created this Plan. Say hi 👋`,
    imageUrl: null,
    createdAt: serverTimestamp(),
  });

  return planId;
}

// ─────────────────────────────────────────────────────────
// Read Plans
// ─────────────────────────────────────────────────────────
export async function getPlan(planId: string): Promise<Plan | null> {
  const ref = doc(db, "plans", planId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Plan;
}

export async function fetchPlans({
  city,
  activityFilter,
  maxResults = 20,
  cursor,
}: {
  city?: string;
  activityFilter?: string | null;
  maxResults?: number;
  cursor?: QueryDocumentSnapshot | null;
}): Promise<{ plans: Plan[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> {
  const constraints: any[] = [
    where("visibility", "==", "public"),
    where("status", "==", "open"),
    where("endTime", ">=", Timestamp.now()),
    orderBy("isHostTier", "desc"),
    orderBy("startTime", "asc"),
  ];

  if (city) constraints.splice(1, 0, where("city", "==", city));
  if (activityFilter) constraints.splice(1, 0, where("activity", "==", activityFilter));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(maxResults));

  const q = query(collection(db, "plans"), ...constraints);
  const snap = await getDocs(q);
  
  const plans = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan));
  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

  return {
    plans,
    lastDoc,
    hasMore: snap.docs.length === maxResults,
  };
}

export async function getMyHostedPlans(uid: string): Promise<Plan[]> {
  const q = query(
    collection(db, "plans"),
    where("hostUid", "==", uid),
    orderBy("startTime", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan));
}

export async function getMyJoinedPlans(uid: string): Promise<Plan[]> {
  const q = query(
    collection(db, "plans"),
    where("participants", "array-contains", uid),
    orderBy("startTime", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan));
}

// ─────────────────────────────────────────────────────────
// Join & Leave
// ─────────────────────────────────────────────────────────
export async function requestJoinPlan(
  planId: string,
  user: GarbaCrewUser,
  message: string = ""
): Promise<void> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) throw new Error("Plan not found");

  const plan = planSnap.data() as Plan;
  if (plan.participants.includes(user.uid)) throw new Error("Already joined");
  if (plan.status === "full") throw new Error("Plan is full");

  const request: PlanJoinRequest = {
    uid: user.uid,
    name: user.name ?? "Someone",
    photoUrl: user.photoUrl ?? null,
    guestScore: user.guestScore ?? 50,
    isVerified: user.isVerified ?? false,
    age: user.age,
    bio: user.bio,
    message: message.trim(),
    requestedAt: Timestamp.now(),
    autoDeclineAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  };

  if (plan.approvalMode === "auto" || plan.approvalMode === "paid_auto") {
    // Auto-approve logic
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
      spotsFilled: increment(1),
    });
    
    // Add to chat
    await updateDoc(doc(db, "chats", plan.chatId), {
      participants: arrayUnion(user.uid),
    });
    
  } else {
    // Manual approval logic
    await updateDoc(planRef, {
      pendingRequests: arrayUnion(request),
    });
  }
}

export async function approveJoinRequest(planId: string, requestUid: string): Promise<void> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) throw new Error("Plan not found");
  const plan = planSnap.data() as Plan;

  const request = plan.pendingRequests.find((r) => r.uid === requestUid);
  if (!request) throw new Error("Request not found");

  await updateDoc(planRef, {
    pendingRequests: plan.pendingRequests.filter((r) => r.uid !== requestUid),
    participants: arrayUnion(requestUid),
    participantDetails: arrayUnion({
      uid: request.uid,
      name: request.name,
      photoUrl: request.photoUrl,
      guestScore: request.guestScore,
      joinedAt: Timestamp.now(),
      approved: true,
    }),
    spotsFilled: increment(1),
  });

  await updateDoc(doc(db, "chats", plan.chatId), {
    participants: arrayUnion(requestUid),
  });
}

export async function declineJoinRequest(planId: string, requestUid: string): Promise<void> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return;
  const plan = planSnap.data() as Plan;

  await updateDoc(planRef, {
    pendingRequests: plan.pendingRequests.filter((r) => r.uid !== requestUid),
  });
}

// Note: The client-side leavePlan is mostly used as a fallback. 
// The primary leave logic should run through the Cloud Function.
export async function leavePlan(planId: string, uid: string): Promise<void> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return;
  const plan = planSnap.data() as Plan;

  await updateDoc(planRef, {
    participants: arrayRemove(uid),
    participantDetails: plan.participantDetails.filter((p) => p.uid !== uid),
    spotsFilled: increment(-1),
  });

  await updateDoc(doc(db, "chats", plan.chatId), {
    participants: arrayRemove(uid),
  });
}

// ─────────────────────────────────────────────────────────
// Host Actions (With No-Fault Streak Pause)
// ─────────────────────────────────────────────────────────
export async function cancelPlan(planId: string): Promise<void> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) throw new Error("Plan not found");

  const plan = planSnap.data() as Plan;
  const now = Date.now();
  const startTime = plan.startTime.toMillis ? plan.startTime.toMillis() : new Date(plan.startTime).getTime();
  const hoursUntilStart = (startTime - now) / (1000 * 60 * 60);

  const batch = writeBatch(db);
  
  // 1. Mark plan as cancelled
  batch.update(planRef, {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });

  // 2. Preserve streaks for all participants (No-Fault Streak Pause)
  // We set a pause flag for 7 days so the weekly evaluator skips them.
  const pauseUntil = Timestamp.fromDate(new Date(now + 7 * 24 * 60 * 60 * 1000)); 
  
  plan.participants.forEach((uid) => {
    const userRef = doc(db, "users", uid);
    batch.update(userRef, {
      streakPausedUntil: pauseUntil,
    });
  });

  // 3. Host accountability: If cancelled <= 24h before start, penalize Guest Score
  if (hoursUntilStart <= 24) {
    const hostRef = doc(db, "users", plan.hostUid);
    batch.update(hostRef, {
      guestScore: increment(-10),
    });
  }

  await batch.commit();
}

export async function markAttendance(
  planId: string,
  uid: string,
  attended: boolean
): Promise<void> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return;
  const plan = planSnap.data() as Plan;

  const currentNoShows = plan.noShowUids || [];
  let newNoShows = [...currentNoShows];

  if (!attended) {
    if (!newNoShows.includes(uid)) newNoShows.push(uid);
  } else {
    newNoShows = newNoShows.filter((id) => id !== uid);
  }

  await updateDoc(planRef, {
    noShowUids: newNoShows,
    noShowMarkedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
export function getPlanRole(
  plan: Plan,
  uid: string
): "host" | "participant" | "pending" | "waitlist" | "visitor" {
  if (plan.hostUid === uid) return "host";
  if (plan.participants?.includes(uid)) return "participant";
  if (plan.pendingRequests?.some((r) => r.uid === uid)) return "pending";
  if (plan.waitlist?.includes(uid)) return "waitlist";
  return "visitor";
}

export function checkRequirements(
  plan: Plan,
  user: GarbaCrewUser
): { ok: boolean; reason?: string } {
  if (plan.requirements?.verifiedOnly && !user.isVerified) {
    return { ok: false, reason: "This Plan requires a verified profile." };
  }
  if (plan.requirements?.womenOnly && user.gender !== "female") {
    return { ok: false, reason: "This Plan is for women only." };
  }
  if (plan.requirements?.minGuestScore != null) {
    const guestScore = user.guestScore ?? 50;
    if (guestScore < plan.requirements.minGuestScore) {
      return {
        ok: false,
        reason: `This Plan requires a Guest Score of at least ${plan.requirements.minGuestScore}.`,
      };
    }
  }
  return { ok: true };
}