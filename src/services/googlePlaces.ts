import { lineString, bbox, point } from '@turf/turf';
import pointToLineDistance from '@turf/point-to-line-distance';
import length from '@turf/length';
import along from '@turf/along';

export interface GooglePlaceStation {
    id: string;
    displayName: { text: string };
    formattedAddress: string;
    location: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
    regularOpeningHours?: {
        openNow: boolean;
        weekdayDescriptions: string[];
    };
    evChargeOptions?: {
        connectorCount: number;
        connectorAggregation: {
            type: string;
            maxChargeRateKw: number;
            count: number;
            outOfServiceCount: number;
        }[];
    };
    reviews?: {
        text: { text: string };
        rating: number;
        authorAttribution: { displayName: string };
        relativePublishTimeDescription: string;
    }[];
}

const PLACES_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.regularOpeningHours,places.evChargeOptions,places.reviews';

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
            headers: getHeaders(PLACES_FIELD_MASK),
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

    // 1. Calculate Route Chunking
    const routeLine = lineString(routeCoordinates);
    const routeLength = length(routeLine, { units: 'kilometers' });

    // Chunking strategy to bypass Google Places 20 results limit
    // We will search in 30km chunks to ensure we don't miss stations on long routes
    const CHUNK_SIZE_KM = 30;
    const numChunks = Math.max(1, Math.ceil(routeLength / CHUNK_SIZE_KM));

    console.log(`[GOOGLE PLACES API] Route is ${routeLength.toFixed(1)}km. Breaking into ${numChunks} chunks for max coverage.`);

    // Helper function to fetch stations within a bbox
    const fetchChunk = async (bboxObj: { minLng: number, minLat: number, maxLng: number, maxLat: number }) => {
        try {
            const response = await fetch(PLACES_API_URL, {
                method: 'POST',
                headers: getHeaders(PLACES_FIELD_MASK),
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

            if (!response.ok) return [];
            const data = await response.json();
            return (data.places || []) as GooglePlaceStation[];
        } catch (error) {
            return [];
        }
    };

    // Calculate chunks and fetch in parallel
    const fetchPromises = [];
    for (let i = 0; i <= numChunks; i++) {
        // Find the center point of our chunk
        const distDist = Math.min(i * CHUNK_SIZE_KM, routeLength);
        const centerPoint = along(routeLine, distDist, { units: 'kilometers' } as any);
        const lng = centerPoint.geometry.coordinates[0];
        const lat = centerPoint.geometry.coordinates[1];

        // Create a bbox around this center point (20km radius = 40x40km square)
        const searchRadiusKm = 20;
        const latDelta = searchRadiusKm / 111;
        const lngDelta = searchRadiusKm / (111 * Math.cos(lat * (Math.PI / 180)));

        fetchPromises.push(fetchChunk({
            minLng: lng - lngDelta,
            minLat: lat - latDelta,
            maxLng: lng + lngDelta,
            maxLat: lat + latDelta
        }));
    }

    try {
        const chunkResults = await Promise.all(fetchPromises);

        // Flatten and deduplicate by ID
        const allStationsMap = new Map<string, GooglePlaceStation>();
        chunkResults.forEach(chunkStations => {
            chunkStations.forEach(station => {
                allStationsMap.set(station.id, station);
            });
        });

        const rawStations = Array.from(allStationsMap.values());
        console.log(`[GOOGLE PLACES API] Raw unique stations fetched across chunks: ${rawStations.length}`);

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
            headers: getHeaders(PLACES_FIELD_MASK),
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
