// src/services/routeService.ts
import { ItineraryItem } from "../types/itinerary";

/**
 * Task 27: Calculates the distance between two coordinates in kilometers (Haversine formula).
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Task 27: Estimates travel time based on distance. Assumes average 20 km/h city driving.
 */
export function estimateTravelTime(distanceKm: number): string {
  if (distanceKm < 0.1) return "Walking distance";
  const timeHours = distanceKm / 20;
  const timeMinutes = Math.round(timeHours * 60);
  
  if (timeMinutes < 60) return `~${timeMinutes} min drive`;
  const hours = Math.floor(timeMinutes / 60);
  const mins = timeMinutes % 60;
  return `~${hours}h ${mins}m drive`;
}

/**
 * Task 27: Processes itinerary items to prepare them for map rendering.
 * Filters out items without coordinates and sorts them chronologically.
 */
export function prepareMapStops(items: ItineraryItem[]) {
  const validItems = items.filter(
    (i) => i.latitude != null && i.longitude != null && i.startAt != null
  );

  // Sort by time
  validItems.sort((a, b) => {
    const timeA = a.startAt?.toMillis?.() || 0;
    const timeB = b.startAt?.toMillis?.() || 0;
    return timeA - timeB;
  });

  return validItems;
}

/**
 * Task 28: Calculates the total straight-line distance of an ordered array of stops.
 */
export function calculateTotalDistance(stops: ItineraryItem[]): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    if (stops[i].latitude && stops[i].longitude && stops[i+1].latitude && stops[i+1].longitude) {
      total += calculateDistance(
        stops[i].latitude!, stops[i].longitude!,
        stops[i+1].latitude!, stops[i+1].longitude!
      );
    }
  }
  return total;
}

/**
 * Task 28: Optimizes the route using a Greedy Nearest-Neighbor algorithm.
 * Respects `isFixedTime` items by treating them as immovable anchors.
 */
export function optimizeRoute(originalStops: ItineraryItem[]): ItineraryItem[] {
  // Filter out items without coordinates, as we can't optimize them spatially
  const stops = [...originalStops].filter(s => s.latitude != null && s.longitude != null);
  if (stops.length < 2) return originalStops;

  // Find the indices of fixed items
  const fixedIndices: number[] = [];
  stops.forEach((stop, index) => {
    if (stop.isFixedTime) fixedIndices.push(index);
  });

  // If everything is fixed, we can't optimize
  if (fixedIndices.length === stops.length) return originalStops;

  const optimized: ItineraryItem[] = [];

  // Process segments between fixed items
  let startIndex = 0;
  
  // Create boundaries: [-1, fixedIdx1, fixedIdx2, stops.length]
  const boundaries = [-1, ...fixedIndices, stops.length];

  for (let b = 0; b < boundaries.length - 1; b++) {
    const segmentStart = boundaries[b] + 1;
    const segmentEnd = boundaries[b + 1];

    // Extract the flexible items in this segment
    const flexibleSegment = stops.slice(segmentStart, segmentEnd);

    // Determine the starting point for this segment (either the previous fixed item or the first flexible item)
    let currentLocation: { lat: number, lng: number } | null = null;
    if (b > 0) {
      const prevFixed = stops[boundaries[b]];
      currentLocation = { lat: prevFixed.latitude!, lng: prevFixed.longitude! };
    }

    // Run greedy nearest-neighbor on the segment
    const optimizedSegment: ItineraryItem[] = [];
    const unvisited = [...flexibleSegment];

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      // If we don't have a current location yet, just take the first item
      if (!currentLocation) {
        nearestIdx = 0;
      } else {
        for (let i = 0; i < unvisited.length; i++) {
          if (unvisited[i].latitude && unvisited[i].longitude) {
            const dist = calculateDistance(
              currentLocation.lat, currentLocation.lng,
              unvisited[i].latitude!, unvisited[i].longitude!
            );
            if (dist < minDistance) {
              minDistance = dist;
              nearestIdx = i;
            }
          }
        }
      }

      const nextStop = unvisited.splice(nearestIdx, 1)[0];
      optimizedSegment.push(nextStop);
      currentLocation = { lat: nextStop.latitude!, lng: nextStop.longitude! };
    }

    // Add the optimized flexible segment to the final array
    optimized.push(...optimizedSegment);

    // Add the boundary fixed item (if it exists)
    if (boundaries[b + 1] < stops.length) {
      optimized.push(stops[boundaries[b + 1]]);
    }
  }

  // Re-attach items that didn't have coordinates (optional, but good for consistency)
  const itemsWithoutCoords = originalStops.filter(s => s.latitude == null || s.longitude == null);
  
  return [...optimized, ...itemsWithoutCoords];
}