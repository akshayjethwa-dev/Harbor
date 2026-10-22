// src/services/offlineService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { ItineraryItem } from "../types/itinerary";

const PREFIX = "@Kithra_offline_itinerary_";
const EXPIRATION_DAYS = 30;

export interface OfflineItineraryData {
  planId: string;
  planTitle: string;
  items: ItineraryItem[];
  downloadedAt: number;
  lastUpdated: number; // To check if the DB has newer data
}

/**
 * Saves the itinerary locally and downloads associated static map images.
 */
export async function downloadItineraryOffline(
  planId: string,
  planTitle: string,
  items: ItineraryItem[],
  latestUpdatedMs: number
): Promise<void> {
  try {
    const cachedItems = [...items];

    // Download map tiles for items that have coordinates
    for (let i = 0; i < cachedItems.length; i++) {
      const item = cachedItems[i];
      if (item.latitude != null && item.longitude != null) {
        const remoteMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${item.latitude},${item.longitude}&zoom=15&size=600x300&markers=${item.latitude},${item.longitude},red-pushpin`;
        
        const localUri = `${FileSystem.documentDirectory}map_${planId}_${item.id}.png`;
        
        try {
          const { uri } = await FileSystem.downloadAsync(remoteMapUrl, localUri);
          // Replace the remote URL with the local file URI for offline use
          item.cachedMapUri = uri; 
        } catch (e) {
          console.warn(`Failed to cache map for item ${item.id}`, e);
        }
      }
    }

    const data: OfflineItineraryData = {
      planId,
      planTitle,
      items: cachedItems,
      downloadedAt: Date.now(),
      lastUpdated: latestUpdatedMs,
    };

    await AsyncStorage.setItem(`${PREFIX}${planId}`, JSON.stringify(data));
  } catch (error: any) {
    if (error.message?.includes("Storage")) {
      throw new Error("Storage is full. Could not save itinerary offline.");
    }
    throw error;
  }
}

/**
 * Retrieves a saved offline itinerary.
 */
export async function getOfflineItinerary(planId: string): Promise<OfflineItineraryData | null> {
  const raw = await AsyncStorage.getItem(`${PREFIX}${planId}`);
  if (!raw) return null;
  return JSON.parse(raw) as OfflineItineraryData;
}

/**
 * Checks if an itinerary is expired (older than 30 days).
 */
export function isOfflineExpired(downloadedAt: number): boolean {
  const daysOld = (Date.now() - downloadedAt) / (1000 * 60 * 60 * 24);
  return daysOld > EXPIRATION_DAYS;
}

/**
 * Fetches all downloaded itineraries for the Offline screen.
 */
export async function getAllOfflineItineraries(): Promise<OfflineItineraryData[]> {
  const keys = await AsyncStorage.getAllKeys();
  const itineraryKeys = keys.filter((k) => k.startsWith(PREFIX));
  
  if (itineraryKeys.length === 0) return [];

  const results = await AsyncStorage.multiGet(itineraryKeys);
  return results
    .map(([_, value]) => (value ? JSON.parse(value) : null))
    .filter(Boolean) as OfflineItineraryData[];
}

/**
 * Deletes an offline itinerary to free up space.
 */
export async function deleteOfflineItinerary(planId: string): Promise<void> {
  await AsyncStorage.removeItem(`${PREFIX}${planId}`);
}