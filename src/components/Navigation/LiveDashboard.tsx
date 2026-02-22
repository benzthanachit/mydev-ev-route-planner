"use client";

import { useEffect, useState } from "react";
import { Battery, Zap, MapPin, Gauge } from "lucide-react";
import { useRouteStore } from "@/store/useRouteStore";
import turfDistance from "@turf/distance";
import { point } from "@turf/helpers";

export default function LiveDashboard() {
    const { origin, destination, selectedWaypoints, totalDistanceKm } = useRouteStore();
    const [speedKnots, setSpeedKnots] = useState<number | null>(null);

    // Calculate distance to next actual stop
    let nextStopDistanceKm = 0;
    if (origin) {
        if (selectedWaypoints.length > 0) {
            nextStopDistanceKm = turfDistance(point(origin.coordinates), point(selectedWaypoints[0].coordinates), { units: 'kilometers' } as any) * 1.2;
        } else if (destination) {
            nextStopDistanceKm = totalDistanceKm || 0;
        }
    }
    const displayNextStop = origin && (selectedWaypoints.length > 0 || destination) ? Math.round(nextStopDistanceKm) : "--";
    const displayTotal = totalDistanceKm ? Math.round(totalDistanceKm) : "--";

    useEffect(() => {
        // Watch user's geolocation for speed tracking
        if (!navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                // speed is in meters per second
                if (position.coords.speed !== null) {
                    // Convert m/s to km/h
                    const speedKmh = position.coords.speed * 3.6;
                    setSpeedKnots(speedKmh);
                }
            },
            (error) => {
                // Warning instead of error so it doesn't break Next.js dev overlay. 
                // Many browsers block geolocation on unsecure localhost or deny it by default.
                console.warn("Geolocation tracking unavailable:", error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    return (
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-3 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-auto flex items-center justify-between text-gray-900">

                {/* Speedometer */}
                <div className="flex flex-col items-center flex-1 border-r border-gray-200">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold mb-1 uppercase tracking-widest">
                        <Gauge className="w-3.5 h-3.5" />
                        Speed
                    </div>
                    <div className="text-4xl font-black tabular-nums tracking-tighter text-blue-600">
                        {speedKnots !== null ? Math.round(speedKnots) : "--"}
                        <span className="text-sm font-semibold text-gray-400 ml-1">km/h</span>
                    </div>
                </div>

                {/* Next Stop */}
                <div className="flex flex-col flex-1 pl-6">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold mb-1 uppercase tracking-widest">
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        Next Stop
                    </div>
                    <div className="text-3xl font-black tabular-nums text-gray-900">
                        {displayNextStop}
                        <span className="text-sm font-semibold text-gray-400 ml-1">km</span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-red-400" />
                        Destination: {displayTotal}km
                    </div>
                </div>

            </div>
        </div>
    );
}
