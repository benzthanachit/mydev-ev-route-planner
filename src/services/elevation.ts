import length from '@turf/length';
import along from '@turf/along';
import { lineString } from '@turf/helpers';

export interface ElevationResult {
    totalGainMeters: number;
    totalLossMeters: number;
    sampledElevations: number[]; // elevation at each sampled point
    sampledCoordinates: [number, number][]; // coordinates corresponding to elevations
}

/**
 * Fetches elevation data for a given route and calculates total elevation gain and loss.
 * @param coordinates Array of [longitude, latitude] representing the route
 * @param mapboxToken Mapbox access token
 * @returns ElevationResult containing gain, loss, and sampled data
 */
export async function getElevationForCoordinates(
    coordinates: [number, number][],
    mapboxToken: string
): Promise<ElevationResult> {
    if (!coordinates || coordinates.length < 2) {
        return { totalGainMeters: 0, totalLossMeters: 0, sampledElevations: [], sampledCoordinates: [] };
    }

    try {
        // 1. Create a LineString from the route coordinates
        const routeLine = lineString(coordinates);

        // 2. Calculate total distance in kilometers
        const totalDistKm = length(routeLine, { units: 'kilometers' });

        // 3. Determine sampling interval
        // Sample every 2 km, but cap at 50 points to avoid overwhelming the API
        const maxSamples = 50;
        let numSamples = Math.ceil(totalDistKm / 2);
        if (numSamples > maxSamples) numSamples = maxSamples;
        if (numSamples < 2) numSamples = 2; // at least start and end

        const intervalKm = totalDistKm / (numSamples - 1);
        const sampledCoords: [number, number][] = [];

        for (let i = 0; i < numSamples; i++) {
            const dist = i * intervalKm;
            const pt = along(routeLine, dist, { units: 'kilometers' } as any);
            sampledCoords.push(pt.geometry.coordinates as [number, number]);
        }

        // 4. Fetch elevation for each sampled point
        // Mapbox Tilequery API: Querying the mapbox.mapbox-terrain-v2 contour layer
        const fetchPromises = sampledCoords.map(async (coord) => {
            const [lon, lat] = coord;
            const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lon},${lat}.json?layers=contour&limit=50&access_token=${mapboxToken}`;
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    console.warn(`Elevation fetch failed for ${lon},${lat} with status ${res.status}`);
                    return 0; // fallback to 0 if failed
                }
                const data = await res.json();

                // Find the highest elevation in the returned contour features
                let ele = 0;
                if (data && data.features && data.features.length > 0) {
                    // Filter features that have an 'ele' property
                    const elevations = data.features
                        .map((f: any) => f.properties?.ele)
                        .filter((e: any) => e !== undefined && e !== null);

                    if (elevations.length > 0) {
                        ele = Math.max(...elevations);
                    }
                }
                return ele;
            } catch (e) {
                console.error("Failed to fetch elevation for", coord, e);
                return 0; // fallback
            }
        });

        const elevations = await Promise.all(fetchPromises);

        // 5. Calculate total gain and loss
        let totalGainMeters = 0;
        let totalLossMeters = 0;

        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff > 0) {
                totalGainMeters += diff;
            } else {
                totalLossMeters += Math.abs(diff);
            }
        }

        return {
            totalGainMeters,
            totalLossMeters,
            sampledElevations: elevations,
            sampledCoordinates: sampledCoords
        };
    } catch (error) {
        console.error("Error in getElevationForCoordinates:", error);
        return { totalGainMeters: 0, totalLossMeters: 0, sampledElevations: [], sampledCoordinates: [] };
    }
}
