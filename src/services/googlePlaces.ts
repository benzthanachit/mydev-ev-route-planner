import { lineString, bbox, point } from '@turf/turf';
import pointToLineDistance from '@turf/point-to-line-distance';

export interface GooglePlaceStation {
    id: string;
    displayName: { text: string };
    formattedAddress: string;
    location: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
}

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';

/**
 * Common headers for the New Google Places API (REST)
 */
function getHeaders(fieldMask: string) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined");
    }
    return {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey || '',
        'X-Goog-FieldMask': fieldMask,
    };
}

/**
 * Searches for stations via a direct text query (e.g. "EV Charging station in Bangkok").
 * Limited to 20 results per call by Google.
 */
export async function searchStationsByQuery(query: string): Promise<GooglePlaceStation[]> {
    try {
        const response = await fetch(PLACES_API_URL, {
            method: 'POST',
            headers: getHeaders('places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount'),
            body: JSON.stringify({
                textQuery: query,
                languageCode: "en"
            })
        });

        if (!response.ok) throw new Error(`Google Places API error: ${response.statusText}`);

        const data = await response.json();
        const stations: GooglePlaceStation[] = data.places || [];
        console.log(`[GOOGLE PLACES] Fetched ${stations.length} stations for query "${query}"`);
        return stations;
    } catch (error) {
        console.error("Failed to search stations by query:", error);
        return [];
    }
}

/**
 * Fetches "EV Charging Station" places restricted within a Turf.js bounding box of the route.
 * Filters the exact results to ensure they are strictly within `distanceKm` of the route line.
 */
export async function getStationsAlongRoute(
    routeCoordinates: [number, number][],
    distanceKm: number = 5
): Promise<GooglePlaceStation[]> {

    if (routeCoordinates.length < 2) return [];

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return [];

    // 1. Calculate BBox for the location restriction
    const routeLine = lineString(routeCoordinates);
    const [minLng, minLat, maxLng, maxLat] = bbox(routeLine);

    try {
        // Use the Places API with a rectangle location restriction
        const response = await fetch(PLACES_API_URL, {
            method: 'POST',
            headers: getHeaders('places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount'),
            body: JSON.stringify({
                textQuery: "EV Charging Station",
                languageCode: "en",
                locationRestriction: {
                    rectangle: {
                        low: { latitude: minLat, longitude: minLng },
                        high: { latitude: maxLat, longitude: maxLng }
                    }
                }
            })
        });

        if (!response.ok) throw new Error(`Google Places API error: ${response.statusText}`);

        const data = await response.json();
        const rawStations: GooglePlaceStation[] = data.places || [];
        console.log(`[GOOGLE PLACES API] Raw stations fetched near route bounding box: ${rawStations.length}`);

        // 2. Strict Spatial Filtering using Turf
        const filteredStations = rawStations.filter(station => {
            const pt = point([station.location.longitude, station.location.latitude]);
            const dist = pointToLineDistance(pt, routeLine, { units: 'kilometers' });
            return dist <= distanceKm;
        });

        console.log(`[FILTER] Final stations that successfully matched the ${distanceKm}km route buffer: ${filteredStations.length} stations`);
        return filteredStations;

    } catch (error) {
        console.error("Failed to get stations along route:", error);
        return [];
    }
}

/**
 * Fetches "EV Charging Station" places restricted within a simple bounding box.
 * Used for viewport-based map clustering.
 */
export async function getStationsInBounds(
    bboxObj: { minLng: number, minLat: number, maxLng: number, maxLat: number }
): Promise<GooglePlaceStation[]> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await fetch(PLACES_API_URL, {
            method: 'POST',
            headers: getHeaders('places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount'),
            body: JSON.stringify({
                textQuery: "EV Charging Station",
                languageCode: "en",
                locationRestriction: {
                    rectangle: {
                        low: { latitude: bboxObj.minLat, longitude: bboxObj.minLng },
                        high: { latitude: bboxObj.maxLat, longitude: bboxObj.maxLng }
                    }
                }
            })
        });

        if (!response.ok) throw new Error(`Google Places API error: ${response.statusText}`);

        const data = await response.json();
        return data.places || [];
    } catch (error) {
        console.error("Failed to fetch viewport stations:", error);
        return [];
    }
}
