// functions/src/curatedEvents.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();
const HARBOR_SYSTEM_UID = "harbor_system";
const CURATED_CATEGORIES = ["coffee", "board games", "hiking", "cricket"];
const MIN_ACTIVE_USERS = 10;
const CAPACITY = 8;

// ─────────────────────────────────────────────────────────
// 1. Daily Scheduler: Create Curated Events
// ─────────────────────────────────────────────────────────
export const scheduleCuratedEvents = onSchedule("0 8 * * *", async () => {
  // Get all completed profiles to analyze city/category density
  const usersSnap = await db.collection("users").where("profileComplete", "==", true).get();
  const cityMap: Record<string, Set<string>> = {};

  usersSnap.forEach((doc) => {
    const user = doc.data();
    if (!user.city || !user.activities) return;
    if (!cityMap[user.city]) cityMap[user.city] = new Set();
    user.activities.forEach((act: string) => {
      if (CURATED_CATEGORIES.includes(act)) {
        cityMap[user.city].add(act);
      }
    });
  });

  for (const [city, activities] of Object.entries(cityMap)) {
    for (const activity of activities) {
      // Count users in this city with this activity
      const countSnap = await db.collection("users")
        .where("city", "==", city)
        .where("activities", "array-contains", activity)
        .where("profileComplete", "==", true)
        .get();

      if (countSnap.size < MIN_ACTIVE_USERS) continue;

      // Check if an upcoming curated event already exists for this city/category
      const existingSnap = await db.collection("plans")
        .where("isCurated", "==", true)
        .where("city", "==", city)
        .where("curatedCategory", "==", activity)
        .where("startTime", ">", Timestamp.now())
        .where("status", "in", ["open", "full"])
        .get();

      if (!existingSnap.empty) continue;

      // Create the curated event
      const start = new Date();
      start.setDate(start.getDate() + 3); // 3 days from now
      start.setHours(18, 0, 0, 0);
      const end = new Date(start.getTime() + 120 * 60 * 1000);

      const planRef = db.collection("plans").doc();
      const planId = planRef.id;
      const chatId = `plan_${planId}`;

      await planRef.set({
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
        curatedCategory: activity,
        activity: activity,
        title: `Harbor Presents: ${activity} meetup`,
        description: `A curated ${activity} event for the Harbor community. Come meet new people!`,
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        durationMinutes: 120,
        locationName: "TBD",
        locationAddress: "",
        city: city,
        latitude: null,
        longitude: null,
        capacity: CAPACITY,
        costTotal: 0,
        costPerPerson: 0,
        requirements: { verifiedOnly: false, womenOnly: false, minGuestScore: null, skillLevel: null },
        approvalMode: "auto",
        visibility: "public",
        participants: [],
        participantDetails: [],
        spotsFilled: 0,
        pendingRequests: [],
        waitlist: [],
        chatId,
        lastMessage: null,
        lastMessageAt: null,
        status: "open",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create chat
      await db.collection("chats").doc(chatId).set({
        type: "plan",
        planId,
        planTitle: `Harbor Presents: ${activity} meetup`,
        participants: [HARBOR_SYSTEM_UID],
        createdAt: FieldValue.serverTimestamp(),
      });

      await db.collection("chats").doc(chatId).collection("messages").add({
        fromUid: "system",
        fromName: "Harbor",
        fromPhotoUrl: null,
        type: "system",
        text: `Welcome to the Harbor Presents ${activity} meetup! We'll assign a facilitator once the event fills.`,
        imageUrl: null,
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info(`Created curated event for ${city} - ${activity}`);
    }
  }
});

// ─────────────────────────────────────────────────────────
// 2. Trigger: Assign Facilitator when event fills
// ─────────────────────────────────────────────────────────
export const assignFacilitator = onDocumentUpdated("plans/{planId}", async (event) => {
  // ✅ FIX: Explicitly check if event.data is undefined
  if (!event.data) return;

  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  if (!after.isCurated) return;
  if (after.facilitatorUid) return;
  if (after.spotsFilled < after.capacity) return;

  // Find a high-trust host in the same city
  const facilitatorsSnap = await db.collection("users")
    .where("city", "==", after.city)
    .where("hostScore", ">=", 80)
    .where("profileComplete", "==", true)
    .orderBy("hostScore", "desc")
    .limit(1)
    .get();

  if (facilitatorsSnap.empty) {
    logger.warn(`No facilitator found for plan ${event.params.planId}`);
    return;
  }

  const facilitator = facilitatorsSnap.docs[0].data();
  
  // ✅ FIX: event.data.after.ref is now safe to use
  await event.data.after.ref.update({
    facilitatorUid: facilitator.uid,
    facilitatorName: facilitator.name ?? "Facilitator",
    facilitatorPhotoUrl: facilitator.photoUrl ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Add facilitator to chat
  const chatRef = db.collection("chats").doc(after.chatId);
  await chatRef.update({
    participants: FieldValue.arrayUnion(facilitator.uid),
  });

  await chatRef.collection("messages").add({
    fromUid: "system",
    fromName: "Harbor",
    fromPhotoUrl: null,
    type: "system",
    text: `${facilitator.name ?? "A facilitator"} has been assigned as your facilitator. Say hi! 👋`,
    imageUrl: null,
    createdAt: FieldValue.serverTimestamp(),
  });
});