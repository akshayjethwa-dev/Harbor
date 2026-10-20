// src/services/itineraryService.ts
import { db } from "../lib/firebase";
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, writeBatch 
} from "firebase/firestore";
import { ItineraryItem } from "../types/itinerary";
import { PlanIdea } from "../types/idea";
import { GarbaCrewUser } from "../types/user";

const itineraryRef = (planId: string) => collection(db, "plans", planId, "itinerary");

export function subscribeToItinerary(
  planId: string,
  callback: (items: ItineraryItem[]) => void
) {
  const q = query(itineraryRef(planId), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, planId, ...d.data() } as ItineraryItem)));
  });
}

export async function addIdeaToItinerary(
  planId: string,
  idea: PlanIdea,
  user: GarbaCrewUser,
  currentMaxOrder: number
): Promise<void> {
  await addDoc(itineraryRef(planId), {
    planId,
    title: idea.title,
    description: idea.description,
    location: idea.location,
    estimatedCost: idea.estimatedCost,
    sourceIdeaId: idea.id,
    addedByUid: user.uid,
    addedAt: serverTimestamp(),
    dayIndex: null, // Starts in Unplanned
    startAt: null,
    endAt: null,
    order: currentMaxOrder + 1,
  });
}

export async function updateItineraryItem(
  planId: string,
  itemId: string,
  updates: Partial<ItineraryItem>
): Promise<void> {
  await updateDoc(doc(db, "plans", planId, "itinerary", itemId), updates);
}

export async function removeFromItinerary(planId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, "plans", planId, "itinerary", itemId));
}

export async function reorderItineraryItems(
  planId: string,
  items: ItineraryItem[]
): Promise<void> {
  const batch = writeBatch(db);
  items.forEach((item, index) => {
    if (item.order !== index) {
      batch.update(doc(db, "plans", planId, "itinerary", item.id), { order: index });
    }
  });
  await batch.commit();
}