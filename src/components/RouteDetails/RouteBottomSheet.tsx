"use client";

import { useRouteStore } from "@/store/useRouteStore";
import { useEVStore } from "@/store/useEVStore";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Zap, Clock, Route as RouteIcon, Info, MapPin } from "lucide-react";
import { useState } from "react";

export default function RouteBottomSheet() {
    const { totalDistanceKm, selectedWaypoints, removeSelectedWaypoint, calculateRoute } = useRouteStore();
    const { currentSoC, maxRange } = useEVStore();

    const [isExpanded, setIsExpanded] = useState(false);

    if (!totalDistanceKm) return null;

    // Very basic dummy calculation
    const estTimeHours = totalDistanceKm / 80; // assume 80km/h avg speed
    const hours = Math.floor(estTimeHours);
    const minutes = Math.round((estTimeHours - hours) * 60);

    // Remaining range based on SoC
    const remainingRange = Math.round((currentSoC / 100) * maxRange);

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

                    <h3 className="text-gray-900 font-extrabold text-xl mb-6">Route Plan</h3>

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
                                return (
                                    <div key={idx} className="relative pl-14 flex flex-col gap-1 py-4">
                                        <div className={`absolute left-0 w-10 h-10 ${isChargingStop ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-400'} border-[3px] rounded-full flex items-center justify-center translate-x-0 outline outline-[6px] outline-white z-10`}>
                                            {isChargingStop ? <Zap className="w-4 h-4 text-emerald-600" /> : <MapPin className="w-4 h-4 text-gray-400" />}
                                        </div>
                                        <h4 className={`${isChargingStop ? 'text-emerald-700' : 'text-gray-900'} font-bold text-lg leading-tight`}>{stop.name}</h4>
                                        {isChargingStop ? (
                                            <p className="text-gray-600 text-sm font-medium flex items-center gap-1.5 mt-0.5">
                                                <Clock className="w-4 h-4 text-amber-500" /> ~45 min charge recommended
                                            </p>
                                        ) : (
                                            <p className="text-gray-500 text-sm font-medium mt-0.5">Navigational Stop</p>
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
                            <p className="text-gray-500 text-sm font-medium">Arriving with ~15% battery</p>
                        </div>

                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
