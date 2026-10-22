// src/lib/geocoding.ts
import * as Location from 'expo-location';

// Your Google Maps API Key from app.json
const GOOGLE_MAPS_API_KEY = 'AIzaSyD_B50LAn-GQy5nnFKP0JJrNRUNM97dLs0';

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    // 1. Try Google Maps Geocoding API (Requires the Geocoding API enabled in Google Cloud Console)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Find the component that represents the city (locality)
      const addressComponents = data.results[0].address_components;
      const cityObj = addressComponents.find(
        (c: any) => c.types.includes('locality') || c.types.includes('administrative_area_level_2')
      );
      
      if (cityObj) {
        return cityObj.long_name;
      }
    }

    // 2. Fallback to BigDataCloud (Free, no API key required) if Google fails
    console.warn('Google Geocoding failed or returned no city, trying fallback...');
    const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const fallbackRes = await fetch(fallbackUrl);
    const fallbackData = await fallbackRes.json();
    
    return fallbackData.city || fallbackData.locality || fallbackData.principalSubdivision || null;

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}