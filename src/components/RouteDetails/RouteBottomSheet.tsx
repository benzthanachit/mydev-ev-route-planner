"use client";

import { useRouteStore } from "@/store/useRouteStore";
import { useEVStore } from "@/store/useEVStore";
import { useSavedRoutesStore } from "@/store/useSavedRoutesStore";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Zap, Clock, Route as RouteIcon, Info, MapPin, Sparkles, Battery, ExternalLink, BookmarkPlus, Check, X } from "lucide-react";
import { useState } from "react";
import turfDistance from "@turf/distance";
import { point } from "@turf/helpers";

export default function RouteBottomSheet() {
    const { totalDistanceKm, selectedWaypoints, removeSelectedWaypoint, calculateRoute, origin, destination, chargingWaypoints, fetchAISuggestions, isFetchingAI, clearRoute } = useRouteStore();
    const { currentSoC, maxRange, maxChargePowerKw, batteryCapacity } = useEVStore();
    const saveRoute = useSavedRoutesStore(state => state.saveRoute);

    const [isExpanded, setIsExpanded] = useState(false);
    const [isSavingRoute, setIsSavingRoute] = useState(false);
    const [routeNameInput, setRouteNameInput] = useState("");

    if (!totalDistanceKm) return null;

    // Driving calculation
    const drivingTimeHours = totalDistanceKm / 80; // assume 80km/h avg speed
    let totalTimeHours = drivingTimeHours;

    // Iterative Leg Calculation for SoC and Charge Times
    let currentSoCForLeg = currentSoC;
    let currentCoord = origin?.coordinates || [0, 0];

    const waypointStats = selectedWaypoints.map(wp => {
        // Distance from previous coord to this wp
        const distKm = turfDistance(point(currentCoord), point(wp.coordinates), { units: 'kilometers' } as any) * 1.2;

        // Arrival SoC
        const socDrop = (distKm / maxRange) * 100;
        const arrivalSoC = Math.round(currentSoCForLeg - socDrop);

        // Departure SoC and Charge Time
        let departureSoC = arrivalSoC;
        let chargeTimeHrs = 0;

        if (wp.googleStationId) {
            // Target charge limit is 80%, but if they arrive with more, we don't discharge
            departureSoC = Math.max(80, arrivalSoC);

            if (arrivalSoC < 80) {
                const pctToCharge = 80 - arrivalSoC;
                const kwhRequired = batteryCapacity * (pctToCharge / 100);
                const stationKw = wp.stationMaxChargeRateKw || 50;
                const effectiveKw = Math.min(stationKw, maxChargePowerKw);
                chargeTimeHrs = kwhRequired / effectiveKw;
            }
            currentSoCForLeg = departureSoC;
        } else {
            currentSoCForLeg = arrivalSoC;
        }

        currentCoord = wp.coordinates;
        totalTimeHours += chargeTimeHrs;

        return { arrivalSoC, departureSoC, chargeTimeHrs };
    });

    const hours = Math.floor(totalTimeHours);
    const minutes = Math.round((totalTimeHours - hours) * 60);

    // Remaining range based on current SoC (origin)
    const remainingRange = Math.round((currentSoC / 100) * maxRange);

    // Destination SoC
    let destSoC = 15; // fallback
    if (origin && destination) {
        let distToDestKm = totalDistanceKm;
        if (selectedWaypoints.length > 0) {
            distToDestKm = turfDistance(point(currentCoord), point(destination.coordinates), { units: 'kilometers' } as any) * 1.2;
        }
        const destSocDrop = (distToDestKm / maxRange) * 100;
        destSoC = Math.round(currentSoCForLeg - destSocDrop);
    }

    // Generate Google Maps Directions URL
    const exportToGoogleMaps = () => {
        if (!origin || !destination) return;

        const originStr = `${origin.coordinates[1]},${origin.coordinates[0]}`;
        const destStr = `${destination.coordinates[1]},${destination.coordinates[0]}`;

        let url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}`;

        if (selectedWaypoints.length > 0) {
            // Google Maps uses latitude,longitude for waypoints, separated by a pipe '|'
            const waypointsStr = selectedWaypoints
                .map(wp => `${wp.coordinates[1]},${wp.coordinates[0]}`)
                .join('|');
            url += `&waypoints=${waypointsStr}`;
        }

        // Open in new tab (will launch Google Maps app on mobile if installed)
        window.open(url, '_blank');
    };

    return (
        <AnimatePresence>
            <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                    if (info.offset.y < -50) setIsExpanded(true);
                    if (info.offset.y > 50) setIsExpanded(false);
                }}
                initial={{ y: "100%" }}
                animate={{ y: isExpanded ? "10%" : "calc(100% - 140px)" }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col h-[85vh]"
            >
                {/* Drag Handle */}
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex justify-center py-4 cursor-pointer"
                >
                    <div className="w-12 h-1.5 bg-gray-300 hover:bg-gray-400 transition-colors rounded-full" />
                </div>

                {/* Header Summary (Always Visible) */}
                <div className="px-6 pb-6 flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <div className="flex flex-col">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{hours}h {minutes}m</h2>
                        <div className="flex items-center gap-2 text-gray-500 font-bold text-sm mt-1">
                            <span className="flex items-center gap-1"><RouteIcon className="w-4 h-4 text-blue-500" /> {totalDistanceKm} km</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-600"><Zap className="w-4 h-4" /> {selectedWaypoints.length} stops</span>
                        </div>
                    </div>

                    <div className="bg-blue-600 p-3 rounded-full shadow-lg shadow-blue-500/30 text-white transition-transform hover:scale-105 active:scale-95">
                        <ChevronUp className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {/* Expandable Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-24">

                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 mb-8 flex gap-4 mt-2">
                        <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-gray-700 leading-relaxed font-medium">
                            Based on your EV profile, you have <b className="text-gray-900">{remainingRange}km</b> of range left ({currentSoC}%).
                            <br /><span className="text-amber-600 font-bold mt-1 block">Check the map for amber-highlighted recommended charging stations!</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-gray-900 font-extrabold text-xl">Route Plan</h3>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            {isSavingRoute ? (
                                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-inner h-[34px]">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={routeNameInput}
                                        onChange={(e) => setRouteNameInput(e.target.value)}
                                        placeholder="Name this route..."
                                        className="text-sm px-2 py-0 bg-transparent border-none outline-none text-gray-800 w-28 md:w-40 font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (routeNameInput.trim() && origin && destination) {
                                                saveRoute({
                                                    name: routeNameInput.trim(),
                                                    origin,
                                                    destination,
                                                    waypoints: selectedWaypoints
                                                });
                                                setIsSavingRoute(false);
                                                setRouteNameInput("");
                                            }
                                        }}
                                        className="p-1 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-sm"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsSavingRoute(false);
                                        }}
                                        className="p-1 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 shadow-sm"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsSavingRoute(true);
                                            const defaultName = origin?.name && destination?.name
                                                ? `${origin.name.split(',')[0]} \u2192 ${destination.name.split(',')[0]}`
                                                : "My Saved Route";
                                            setRouteNameInput(defaultName);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                                    >
                                        <BookmarkPlus className="w-4 h-4" />
                                        Save
                                    </button>

                                    {/* Cancel Route Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearRoute();
                                            setIsExpanded(false);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_8px_rgba(0,0,0,0.1)] active:scale-95 bg-red-500 border border-red-600/50 text-white hover:bg-red-600 hover:shadow-[0_6px_12px_rgba(220,38,38,0.3)] shadow-red-500/20"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancel
                                    </button>

                                    {/* Export to Google Maps Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            exportToGoogleMaps();
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Export
                                    </button>

                                    {/* Manual AI Trigger Button */}
                                    {chargingWaypoints.length > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // prevent drag expansion collision
                                                fetchAISuggestions(chargingWaypoints, totalDistanceKm);
                                            }}
                                            disabled={isFetchingAI}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 ${isFetchingAI
                                                ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-purple-500/30'
                                                }`}
                                        >
                                            <Sparkles className={`w-4 h-4 ${isFetchingAI ? 'animate-spin' : ''}`} />
                                            {isFetchingAI ? 'Thinking...' : 'Auto Plan'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 relative before:absolute before:inset-0 before:left-[19px] before:w-[3px] before:bg-gray-200">

                        {/* Start point */}
                        <div className="relative pl-14 flex flex-col gap-1">
                            <div className="absolute left-0 w-10 h-10 bg-white border-[3px] border-blue-500 rounded-full flex items-center justify-center translate-x-0 outline outline-[6px] outline-white z-10">
                                <div className="w-3.5 h-3.5 bg-blue-500 rounded-full" />
                            </div>
                            <h4 className="text-gray-900 font-bold text-lg">Start Location</h4>
                            <p className="text-gray-500 text-sm font-medium">Battery at {currentSoC}%</p>
                        </div>

                        {/* Charging & Normal Stops */}
                        {selectedWaypoints.length === 0 ? (
                            <div className="relative pl-14 flex flex-col gap-1 py-4">
                                <div className="absolute left-[3px] w-8 h-8 bg-gray-100 border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center translate-x-0 z-10">
                                    <span className="text-gray-400 text-xs font-bold">?</span>
                                </div>
                                <h4 className="text-gray-500 font-bold text-sm italic">No stops selected. Click a highlighted station or drop a pin to add one.</h4>
                            </div>
                        ) : (
                            selectedWaypoints.map((stop, idx) => {
                                const isChargingStop = !!stop.googleStationId;
                                const stats = waypointStats[idx];
                                return (
                                    <div key={idx} className="relative pl-14 flex flex-col gap-1 py-4">
                                        <div className={`absolute left-0 w-10 h-10 ${isChargingStop ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-400'} border-[3px] rounded-full flex items-center justify-center translate-x-0 outline outline-[6px] outline-white z-10`}>
                                            {isChargingStop ? <Zap className="w-4 h-4 text-emerald-600" /> : <MapPin className="w-4 h-4 text-gray-400" />}
                                        </div>
                                        <h4 className={`${isChargingStop ? 'text-emerald-700' : 'text-gray-900'} font-bold text-lg leading-tight`}>{stop.name}</h4>
                                        {isChargingStop ? (
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <p className="text-gray-700 text-sm font-bold flex items-center gap-1.5 mb-0.5">
                                                    <Battery className="w-4 h-4 text-emerald-500" />
                                                    Arrive at <span className={stats.arrivalSoC < 15 ? 'text-red-500' : ''}>{stats.arrivalSoC}%</span> &rarr; Leave at <span className="text-emerald-600">{stats.departureSoC}%</span>
                                                </p>
                                                <p className="text-gray-600 text-sm font-medium flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-amber-500" />
                                                    ~{Math.round(stats.chargeTimeHrs * 60)} min charge ({Math.min(stop.stationMaxChargeRateKw || 50, maxChargePowerKw)}kW)
                                                </p>
                                                <p className="text-xs text-gray-400 font-medium pl-6">
                                                    Station max: {stop.stationMaxChargeRateKw || 'Unknown'}kW | Car max: {maxChargePowerKw}kW
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <p className="text-gray-500 text-sm font-medium">Navigational Stop</p>
                                                <p className="text-gray-700 text-sm font-bold flex items-center gap-1.5">
                                                    <Battery className="w-4 h-4 text-emerald-500" />
                                                    Arriving at <span className={stats.arrivalSoC < 15 ? 'text-red-500' : ''}>{stats.arrivalSoC}%</span>
                                                </p>
                                            </div>
                                        )}
                                        <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center mt-3 border border-gray-100">
                                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Added to Route Plan</p>
                                            <button
                                                className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline px-2 py-1"
                                                onClick={() => {
                                                    const idToRemove = stop.googleStationId || stop.id;
                                                    if (idToRemove) {
                                                        removeSelectedWaypoint(idToRemove);
                                                        calculateRoute();
                                                    }
                                                }}
                                            >
                                                Remove Stop
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* End point */}
                        <div className="relative pl-14 flex flex-col gap-1">
                            <div className="absolute left-0 w-10 h-10 bg-white border-[3px] border-red-500 rounded-full flex items-center justify-center translate-x-0 outline outline-[6px] outline-white z-10">
                                <MapPin className="w-4 h-4 text-red-500" />
                            </div>
                            <h4 className="text-gray-900 font-bold text-lg">Destination</h4>
                            <p className="text-gray-500 text-sm font-medium">
                                {destSoC < 0
                                    ? <span className="text-red-500">Not enough battery! Add a charging stop.</span>
                                    : `Arriving with ~${destSoC}% battery`}
                            </p>
                        </div>

                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
