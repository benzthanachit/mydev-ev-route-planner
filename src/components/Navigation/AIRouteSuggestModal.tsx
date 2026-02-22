"use client";

import { useRouteStore } from "@/store/useRouteStore";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Clock, Zap, MapPin } from "lucide-react";

export default function AIRouteSuggestModal() {
    const { showAIModal, isFetchingAI, aiSuggestions, aiError, setShowAIModal, viewportStations, addSelectedWaypoint, calculateRoute, chargingWaypoints } = useRouteStore();

    if (!showAIModal) return null;

    const handleSelectPlan = (stationIds: string[]) => {
        // Map station IDs to LocationPoint objects. AI only has stationIDs.
        // We look for them in chargingWaypoints (the stations fetched along the route).
        stationIds.forEach(id => {
            const stationData = chargingWaypoints.find(w => w.id === id);
            if (stationData) {
                let maxKw = 0;
                const options = stationData.evChargeOptions?.connectorAggregation;
                if (options && options.length > 0) {
                    maxKw = Math.max(...options.map((conn: any) => conn.maxChargeRateKw || 0));
                }

                addSelectedWaypoint({
                    name: stationData.displayName?.text || 'Charging Station',
                    coordinates: [stationData.location.longitude, stationData.location.latitude],
                    googleStationId: stationData.id,
                    stationMaxChargeRateKw: maxKw > 0 ? maxKw : undefined
                });
            }
        });
        setShowAIModal(false);
        calculateRoute(); // Recalculate route to include the newly added charging stops
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_20px_60px_rgb(0,0,0,0.15)] flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xl tracking-tight">
                            <Sparkles className="w-6 h-6 text-indigo-600" />
                            AI Route Suggestions
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="p-2.5 text-indigo-400 hover:text-indigo-900 bg-white/50 hover:bg-white rounded-full transition-all shadow-sm border border-indigo-100">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 flex flex-col gap-4 overflow-y-auto bg-gray-50/50">
                        {isFetchingAI ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                <p className="text-gray-500 font-bold text-sm animate-pulse">Analyzing route and predicting battery...</p>
                            </div>
                        ) : aiError ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                                    <X className="w-6 h-6 text-red-500" />
                                </div>
                                <p className="text-red-600 font-bold">{aiError}</p>
                                <p className="text-gray-500 text-sm">Please make sure you have added your GEMINI_API_KEY in the .env.local file and restarted the server.</p>
                                <button
                                    onClick={() => setShowAIModal(false)}
                                    className="mt-4 px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors text-sm"
                                >
                                    Close and Plan Manually
                                </button>
                            </div>
                        ) : aiSuggestions.length > 0 ? (
                            <>
                                <p className="text-sm text-gray-600 font-medium mb-2">
                                    Our AI has analyzed your vehicle profile and the stations ahead. Here are 3 recommended charging plans:
                                </p>
                                <div className="flex flex-col gap-4">
                                    {aiSuggestions.map((plan, idx) => (
                                        <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                                                        {idx === 0 && <Zap className="w-4 h-4 text-emerald-500" />}
                                                        {idx === 1 && <Sparkles className="w-4 h-4 text-amber-500" />}
                                                        {idx === 2 && <MapPin className="w-4 h-4 text-blue-500" />}
                                                        {plan.planName}
                                                    </h3>
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">{plan.description}</p>
                                                </div>
                                                <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-sm border border-blue-100 shrink-0">
                                                    <Clock className="w-4 h-4 text-blue-500" />
                                                    +{plan.estimatedTotalChargeTimeMinutes}m
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-1">
                                                <p className="text-sm text-gray-700 leading-snug">
                                                    {plan.reasoning}
                                                </p>
                                                <p className="text-xs text-indigo-600 font-bold mt-2">
                                                    • {plan.stationIds.length} Charging {plan.stationIds.length === 1 ? 'Stop' : 'Stops'}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => handleSelectPlan(plan.stationIds)}
                                                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
                                            >
                                                Select Plan
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <p className="text-gray-500 font-medium text-sm text-center">No AI suggestions could be generated for this route.</p>
                                <button
                                    onClick={() => setShowAIModal(false)}
                                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors text-sm"
                                >
                                    Plan Manually
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
