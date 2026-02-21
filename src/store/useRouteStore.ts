import { create } from 'zustand';
import { useEVStore } from './useEVStore';
import turfDistance from '@turf/distance';
import { point } from '@turf/helpers';

import { GooglePlaceStation } from '@/services/googlePlaces';

export interface LocationPoint {
    name: string;
    coordinates: [number, number]; // [longitude, latitude]
    googleStationId?: string;
    id?: string;
    stationMaxChargeRateKw?: number;
}

export interface RouteState {
    origin: LocationPoint | null;
    destination: LocationPoint | null;
    routeCoordinates: [number, number][] | null; // For drawing the path on Mapbox
    totalDistanceKm: number | null;
    chargingWaypoints: LocationPoint[]; // Auto-generated or fetched stations along the route

    // Interactive Map State
    viewportStations: GooglePlaceStation[]; // Stations visible in current map view
    selectedWaypoints: LocationPoint[]; // User-selected charging stops
    recommendedStationIds: string[]; // IDs of stations that fall in the <30% SoC zone

    // Actions
    setOrigin: (loc: LocationPoint | null) => void;
    setDestination: (loc: LocationPoint | null) => void;
    setViewportStations: (stations: GooglePlaceStation[]) => void;
    addSelectedWaypoint: (waypoint: LocationPoint) => void;
    removeSelectedWaypoint: (stationId: string) => void;
    calculateRoute: () => void;
}

export const useRouteStore = create<RouteState>((set, get) => ({
    origin: null,
    destination: null,
    routeCoordinates: null,
    totalDistanceKm: null,
    chargingWaypoints: [],
    viewportStations: [],
    selectedWaypoints: [],
    recommendedStationIds: [],

    setOrigin: (loc) => set({ origin: loc }),
    setDestination: (loc) => set({ destination: loc }),
    setViewportStations: (stations) => set({ viewportStations: stations }),
    addSelectedWaypoint: (wp) => set((state) => ({ selectedWaypoints: [...state.selectedWaypoints, wp] })),
    removeSelectedWaypoint: (id) => set((state) => ({
        selectedWaypoints: state.selectedWaypoints.filter(w => (w.googleStationId || w.id) !== id)
    })),

    // Fetch real route from Mapbox Directions API
    calculateRoute: async () => {
        const { origin, destination } = get();

        if (!origin || !destination) {
            console.warn("Origin or destination is missing");
            return;
        }

        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!mapboxToken) {
            console.error("Mapbox token is missing!");
            return;
        }

        try {
            // 1. Fetch Route from Mapbox Directions API (including intermediate user-selected waypoints)
            const coords = [origin.coordinates];
            get().selectedWaypoints.forEach(wp => coords.push(wp.coordinates));
            coords.push(destination.coordinates);

            const coordinatesStr = coords.map(c => `${c[0]},${c[1]}`).join(';');
            const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesStr}?geometries=geojson&overview=full&access_token=${mapboxToken}`;

            const response = await fetch(directionsUrl);
            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                console.error("Mapbox Directions API returned no route", data);
                return;
            }

            const route = data.routes[0];
            const distKm = parseFloat((route.distance / 1000).toFixed(2));
            const durationMins = parseFloat((route.duration / 60).toFixed(0));

            console.log(`[ROUTING] Mapbox Directions API Response (Distance & Duration): ${distKm} km, ${durationMins} mins`);

            const geojsonCoords = route.geometry.coordinates as [number, number][];

            // Update store with the route line
            set({
                routeCoordinates: geojsonCoords,
                totalDistanceKm: distKm,
            });

            // 2. Fetch charging stations along the route using Google Places API (10km buffer)
            const { getStationsAlongRoute } = await import('@/services/googlePlaces');
            const stations = await getStationsAlongRoute(geojsonCoords, 10);

            const waypoints: LocationPoint[] = stations.map(st => ({
                name: st.displayName?.text || 'Charging Station',
                coordinates: [st.location.longitude, st.location.latitude],
                googleStationId: st.id
            }));

            // 3. Recommended Stations Logic
            // Calculate distance from the *last* stop (or origin) to predict where the battery drops below 30%
            const evState = useEVStore.getState();
            // Remaining range from the last charging stop (assuming they charge to 80% at a waypoint, or start at currentSoC)
            const previousChargingStops = get().selectedWaypoints.filter(wp => wp.googleStationId);
            const hasChargingWaypoints = previousChargingStops.length > 0;
            const startSoC = hasChargingWaypoints ? 80 : evState.currentSoC;
            const absoluteRangeKm = (startSoC / 100) * evState.maxRange;

            // We recommend stations when distance is between 40% and 70% of absolute range
            // (meaning the battery will have dropped to 40% - 10% range)
            const minRecommendedDist = absoluteRangeKm - (0.4 * evState.maxRange);
            const maxRecommendedDist = absoluteRangeKm - (0.1 * evState.maxRange);

            // The reference coordinate for distance calculation is the last charging stop (or origin)
            const refCoord = hasChargingWaypoints
                ? previousChargingStops[previousChargingStops.length - 1].coordinates
                : origin.coordinates;

            const recommendedIds: string[] = [];
            stations.forEach(st => {
                const distFromRef = turfDistance(point(refCoord), point([st.location.longitude, st.location.latitude]), { units: 'kilometers' } as any);
                if (distFromRef >= minRecommendedDist && distFromRef <= maxRecommendedDist) {
                    recommendedIds.push(st.id);
                }
            });

            // Complete calculate routine: clear viewport stations so map shows only route stations
            set({
                chargingWaypoints: waypoints,
                viewportStations: [],
                recommendedStationIds: recommendedIds
            });

        } catch (error) {
            console.error("Error calculating route:", error);
        }
    }
}));
