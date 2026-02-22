import * as turf from '@turf/turf';

export interface OCMConnection {
    ID: number;
    ConnectionTypeID: number;
    Reference?: string;
    StatusTypeID?: number;
    LevelID?: number;
    Amps?: number;
    Voltage?: number;
    PowerKW?: number;
    CurrentTypeID?: number;
    Quantity?: number;
    Comments?: string;
}

export interface OCMAddressInfo {
    ID: number;
    Title: string;
    AddressLine1?: string;
    AddressLine2?: string;
    Town?: string;
    StateOrProvince?: string;
    Postcode?: string;
    CountryID?: number;
    Country?: {
        ISOCode: string;
        ContinentCode: string;
        ID: number;
        Title: string;
    };
    Latitude: number;
    Longitude: number;
    ContactTelephone1?: string;
    ContactTelephone2?: string;
    ContactEmail?: string;
    AccessComments?: string;
    RelatedURL?: string;
    Distance?: number;
    DistanceUnit?: number;
}

export interface OCMStation {
    ID: number;
    UUID?: string;
    OperatorID?: number;
    UsageTypeID?: number;
    UsageCost?: string;
    AddressInfo: OCMAddressInfo;
    Connections: OCMConnection[];
    NumberOfPoints?: number;
    GeneralComments?: string;
    DatePlanned?: string;
    DateLastConfirmed?: string;
    StatusTypeID?: number;
    DateLastStatusUpdate?: string;
    DataQualityLevel?: number;
    DateCreated?: string;
    SubmissionStatusTypeID?: number;
}

const OCM_BASE_URL = "https://api.openchargemap.io/v3/poi";

/**
 * Fetch charging stations around a specific coordinate
 */
export async function getChargingStations(
    latitude: number,
    longitude: number,
    distance: number = 50, // default 50km
    connectionTypeId: number = 33 // Default to CCS Type 2
): Promise<OCMStation[]> {
    const apiKey = process.env.NEXT_PUBLIC_OCM_API_KEY;
    if (!apiKey) {
        console.warn("NEXT_PUBLIC_OCM_API_KEY is not defined");
        return [];
    }

    const url = new URL(OCM_BASE_URL);
    url.searchParams.append("latitude", latitude.toString());
    url.searchParams.append("longitude", longitude.toString());
    url.searchParams.append("distance", distance.toString());
    url.searchParams.append("distanceunit", "km");
    url.searchParams.append("connectiontypeid", connectionTypeId.toString());
    url.searchParams.append("maxresults", "100");
    url.searchParams.append("compact", "true");
    url.searchParams.append("verbose", "false");

    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "X-API-Key": apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`OCM API error: ${response.statusText}`);
        }

        const data: OCMStation[] = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch charging stations:", error);
        return [];
    }
}

/**
 * Helper function for mock route testing from Hat Yai to Prachuap Khiri Khan.
 * Uses bounding box to fetch stations along the route.
 */
export async function getMockRouteChargingStations(): Promise<OCMStation[]> {
    const apiKey = process.env.NEXT_PUBLIC_OCM_API_KEY;
    if (!apiKey) {
        console.warn("NEXT_PUBLIC_OCM_API_KEY is not defined");
        return [];
    }

    // Hat Yai: 7.002, 100.474
    // Prachuap Khiri Khan: 11.801, 99.796
    // Bounding box format: (minLat,minLng),(maxLat,maxLng)
    // Actually OCM boundingbox uses: (lat1,lng1),(lat2,lng2)
    const lat1 = 7.002;
    const lng1 = 99.796; // min lng
    const lat2 = 11.801;
    const lng2 = 100.474; // max lng

    const url = new URL(OCM_BASE_URL);
    url.searchParams.append("boundingbox", `(${lat1},${lng1}),(${lat2},${lng2})`);
    url.searchParams.append("connectiontypeid", "33");
    url.searchParams.append("maxresults", "100");
    url.searchParams.append("compact", "true");
    url.searchParams.append("verbose", "false");

    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "X-API-Key": apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`OCM API error: ${response.statusText}`);
        }

        const data: OCMStation[] = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch mock route charging stations:", error);
        return [];
    }
}

/**
 * Fetch charging stations along a route with a specific buffer distance.
 */
export async function getStationsAlongRoute(
    routeCoordinates: [number, number][],
    distanceKm: number = 5
): Promise<OCMStation[]> {
    const apiKey = process.env.NEXT_PUBLIC_OCM_API_KEY;
    if (!apiKey) {
        console.warn("NEXT_PUBLIC_OCM_API_KEY is not defined");
        return [];
    }

    if (!routeCoordinates || routeCoordinates.length === 0) {
        return [];
    }

    // 1. Create a LineString from the route coordinates
    const routeLine = turf.lineString(routeCoordinates);

    // 2. Calculate the bounding box for the route
    const [minLng, minLat, maxLng, maxLat] = turf.bbox(routeLine);

    // OCM uses (minLat,minLng),(maxLat,maxLng) actually it's (lat1,lng1),(lat2,lng2)
    const boundingBox = `(${minLat},${minLng}),(${maxLat},${maxLng})`;

    const url = new URL(OCM_BASE_URL);
    url.searchParams.append("boundingbox", boundingBox);
    url.searchParams.append("connectiontypeid", "33"); // CCS Type 2
    url.searchParams.append("maxresults", "500");
    url.searchParams.append("compact", "true");
    url.searchParams.append("verbose", "false");

    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "X-API-Key": apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`OCM API error: ${response.statusText}`);
        }

        const data: OCMStation[] = await response.json();
        console.log(`[OCM API] Raw stations fetched within bounding box: ${data.length} stations`);

        // 3. Filter stations to only those strictly within the buffer distance of the route
        const filteredStations = data.filter(station => {
            const pt = turf.point([station.AddressInfo.Longitude, station.AddressInfo.Latitude]);
            const dist = (turf as any).pointToLineDistance(pt, routeLine, { units: 'kilometers' });
            return dist <= distanceKm;
        });

        console.log(`[FILTER] Final stations that successfully matched the ${distanceKm}km route buffer: ${filteredStations.length} stations`);

        return filteredStations;
    } catch (error) {
        console.error("Failed to fetch stations along route:", error);
        return [];
    }
}

/**
 * Fetch all charging stations in Thailand.
 */
export async function getAllThailandStations(): Promise<OCMStation[]> {
    const apiKey = process.env.NEXT_PUBLIC_OCM_API_KEY;
    if (!apiKey) {
        console.warn("NEXT_PUBLIC_OCM_API_KEY is not defined");
        return [];
    }

    const url = new URL(OCM_BASE_URL);
    url.searchParams.append("countrycode", "TH");
    url.searchParams.append("connectiontypeid", "33"); // CCS Type 2
    url.searchParams.append("maxresults", "1000"); // Try to get as much as possible for Thailand
    url.searchParams.append("compact", "true");
    url.searchParams.append("verbose", "false");

    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "X-API-Key": apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`OCM API error: ${response.statusText}`);
        }

        const data: OCMStation[] = await response.json();
        console.log(`[OCM API] Fetched ${data.length} total stations in Thailand`);
        return data;
    } catch (error) {
        console.error("Failed to fetch all Thailand stations:", error);
        return [];
    }
}
