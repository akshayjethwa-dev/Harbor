// src/types/itinerary.ts
import { Timestamp } from "firebase/firestore";

export interface ItineraryItem {
  id: string;
  planId: string;
  title: string;
  description: string;
  
  // Location Data
  location: string | null; // The raw string typed or selected
  locationAddress?: string | null; // Formatted address from Google
  latitude?: number | null;
  longitude?: number | null;
  
  estimatedCost: number | null;
  sourceIdeaId: string | null;
  addedByUid: string;
  addedAt: Timestamp | any;
  
  // Time Slots
  dayIndex: number | null;
  startAt: Timestamp | null;
  endAt: Timestamp | null;
  order: number;

  isFixedTime?: boolean;
  cachedMapUri?: string | null;
}