// src/services/locationService.ts
export interface PlacePrediction {
  placeId: string;
  description: string;
}

export interface PlaceDetails {
  address: string;
  latitude: number;
  longitude: number;
}

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY";

/**
 * Fetch autocomplete predictions based on user input.
 */
export async function searchLocations(query: string): Promise<PlacePrediction[]> {
  if (!query || query.length < 3) return [];

  // Mocking the API call for development if no key is present
  if (GOOGLE_API_KEY === "YOUR_API_KEY") {
    await new Promise((r) => setTimeout(r, 300)); // Simulate network
    return [
      { placeId: "mock_1", description: `${query} - Cafe Coffee Day` },
      { placeId: "mock_2", description: `${query} - Gateway of India` },
      { placeId: "mock_3", description: `${query} - Central Park` },
    ];
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query
    )}&key=${GOOGLE_API_KEY}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.predictions) {
      return data.predictions.map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
      }));
    }
    return [];
  } catch (e) {
    console.warn("Places Autocomplete failed:", e);
    return [];
  }
}

/**
 * Fetch Lat/Lng and formatted address for a selected place.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (GOOGLE_API_KEY === "YOUR_API_KEY") {
    return {
      address: "123 Mock Street, City",
      latitude: 19.0760,
      longitude: 72.8777,
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.result && data.result.geometry) {
      return {
        address: data.result.formatted_address,
        latitude: data.result.geometry.location.lat,
        longitude: data.result.geometry.location.lng,
      };
    }
    return null;
  } catch (e) {
    console.warn("Place Details failed:", e);
    return null;
  }
}