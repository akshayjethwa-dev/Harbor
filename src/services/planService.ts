import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  startAfter,
  setDoc,
  QueryDocumentSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Plan, PlanDraft, PlanJoinRequest } from "../types/plan";
import { GarbaCrewUser } from "../types/user"; // Kept as GarbaCrewUser to match the alias in user.ts

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
  const costPerPerson =
    draft.capacity > 0 ? Math.round(draft.costTotal / draft.capacity) : 0;

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
    hostSubscriptionTier: host.subscriptionTier || "free",
    isHostTier: host.subscriptionTier === "host",

    activity: draft.activity,
    activityCustom: draft.activityCustom || "",
    title: draft.title.trim(),
    description: draft.description.trim(),

    startTime: Timestamp.fromDate(start),
    endTime: Timestamp.fromDate(end),
    durationMinutes: draft.durationMinutes,

    locationName: draft.locationName.trim(),
    locationAddress: draft.locationAddress.trim(),
    city: draft.city,
    latitude: draft.latitude,
    longitude: draft.longitude,

    capacity: draft.capacity,
    costTotal: draft.costTotal,
    costPerPerson,
    requiresWaiver: draft.requiresWaiver || false,

    requirements: draft.requirements, // Will now hold preferredVibe, requiredInterest, etc.
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
    fromName: "Crew", // Changed from "GarbaCrew"
    fromPhotoUrl: null,
    type: "system",
    text: `${host.name ?? "Host"} created this Plan. Say hi 👋`,
    imageUrl: null,
    createdAt: serverTimestamp(),
  });

  return planId;
}

// ─────────────────────────────────────────────────────────
// Read
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
}): Promise<{
  plans: Plan[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}> {
  const constraints: any[] = [
    where("visibility", "==", "public"),
    where("status", "==", "open"),
    where("endTime", ">=", Timestamp.now()), // <-- Hides expired plans
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

// ─────────────────────────────────────────────────────────
// Role helper
// ─────────────────────────────────────────────────────────
export function getPlanRole(
  plan: Plan,
  uid: string
): "host" | "participant" | "pending" | "waitlist" | "visitor" {
  if (plan.hostUid === uid) return "host";
  if (plan.participants.includes(uid)) return "participant";
  if (plan.pendingRequests?.some((r) => r.uid === uid)) return "pending";
  if (plan.waitlist.includes(uid)) return "waitlist";
  return "visitor";
}

// ─────────────────────────────────────────────────────────
// Requirements check (Generic)
// ─────────────────────────────────────────────────────────
export function checkRequirements(
  plan: Plan,
  user: GarbaCrewUser
): { ok: boolean; reason?: string } {
  const req = plan.requirements;

  if (req.verifiedOnly && !user.isVerified) {
    return { ok: false, reason: "This Plan requires a verified profile." };
  }
  
  if (req.womenOnly && user.gender !== "female") {
    return { ok: false, reason: "This Plan is women-only." };
  }
  
  if (req.minGuestScore != null && (user.guestScore ?? 50) < req.minGuestScore) {
    return {
      ok: false,
      reason: `Minimum Guest Score required: ${req.minGuestScore}.`,
    };
  }

  // Generic Vibe Matching
  const reqAny = req as any;
  if (reqAny.preferredVibe && user.socialVibe !== reqAny.preferredVibe) {
    return {
      ok: false,
      reason: `This host prefers a ${reqAny.preferredVibe} vibe for this plan.`,
    };
  }

  // Generic Interest Matching
  if (reqAny.requiredInterest) {
    if (!user.interests || !user.interests.includes(reqAny.requiredInterest)) {
      return {
        ok: false,
        reason: `This Plan is specifically for people interested in ${reqAny.requiredInterest}.`,
      };
    }
  }

  return { ok: true };
}

export function describeJoinRequest(req: PlanJoinRequest): string {
  return `${req.name} requested to join`;
}

// ─────────────────────────────────────────────────────────
// Task 34: Update Visibility & Capacity
// ─────────────────────────────────────────────────────────
export async function updatePlanVisibilityAndCapacity(
  planId: string,
  visibility: "public" | "squad_only" | "private",
  capacity: number
): Promise<void> {
  const planRef = doc(db, "plans", planId);
  await updateDoc(planRef, {
    visibility,
    capacity,
    updatedAt: serverTimestamp(),
  });
}