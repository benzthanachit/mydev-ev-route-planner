import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { evProfile, routeDetails, stations } = body;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API Key is not configured." }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // We use gemini-1.5-flash as it is fast and suitable for this JSON parsing task
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `You are an expert EV Route Planner. I will provide you with the user's EV profile, their route details, and a list of available charging stations along the route.

CRITICAL RULE (The Charging Sweet Spot with Terrain Penalty):
You MUST select charging stations such that the EV arrives at each station with roughly 20% to 40% battery remaining. 
- You can calculate the arrival battery % mathematically, incorporating an elevation penalty (driving uphill consumes more battery):
  Arrival SoC = Current SoC - ((Distance to Station / EV Max Range) * 100) - ((Elevation Gain to Station in meters / 100) * 1)
- The elevation penalty assumes roughly 1% of battery is consumed for every 100 meters of elevation gain.
- Do not let the Arrival SoC drop below 5% (to avoid running out of charge).
- Do not suggest stopping at a station if the Arrival SoC is > 50% unless absolutely necessary, as charging at high SoC is slow.

Your task is to analyze this data and generate exactly 3 distinct charging plans.
1. "Fastest Arrival": Focus on minimizing total travel and charge time (use the highest kW stations closest to the 20% sweet spot).
2. "Relaxed Journey": Focus on highly-rated stations or stations with many amenities, spacing out stops comfortably.
3. "High Power Only": Strictly use stations with > 50kW chargers.

Return the response as a JSON array containing exactly 3 objects. Each object must strictly match this structure:
{
    "planName": "Name of the plan (e.g., Fastest Arrival)",
    "description": "A short 1-sentence description of the plan strategy.",
    "reasoning": "A 1-2 sentence explanation of why this plan was chosen based on the provided stations and how it hits the 20-40% sweet spot.",
    "estimatedTotalChargeTimeMinutes": 45,
    "stationIds": ["station_id_1", "station_id_2"]
}

Data:
EV Profile: ${JSON.stringify(evProfile)}
Route Distance (km): ${routeDetails.totalDistanceKm}
Route Elevation Gain (m): ${routeDetails.totalElevationGainMeters || 0}
Available Stations:
${JSON.stringify(stations.map((s: any) => ({
            id: s.id,
            name: s.locationName || s.name || s.displayName?.text,
            rating: s.rating,
            distanceFromOriginKm: s.distanceFromOriginKm,
            elevationGainMeters: s.elevationGainMeters,
            evChargeOptions: s.evChargeOptions
        })))}
`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        const plans = JSON.parse(textResponse);

        return NextResponse.json({ plans });

    } catch (error) {
        console.error("AI Route Suggestion Error:", error);
        return NextResponse.json({ error: "Failed to generate AI suggestions" }, { status: 500 });
    }
}
