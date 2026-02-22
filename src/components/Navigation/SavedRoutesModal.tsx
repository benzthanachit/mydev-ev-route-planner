import { motion, AnimatePresence } from "framer-motion";
import { useSavedRoutesStore } from "@/store/useSavedRoutesStore";
import { useRouteStore } from "@/store/useRouteStore";
import { X, Route as RouteIcon, MapPin, Zap, Trash2 } from "lucide-react";

interface SavedRoutesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SavedRoutesModal({ isOpen, onClose }: SavedRoutesModalProps) {
    const { savedRoutes, deleteRoute } = useSavedRoutesStore();
    const { setOrigin, setDestination, setWaypoints, calculateRoute } = useRouteStore();

    if (!isOpen) return null;

    const handleLoadRoute = (route: any) => {
        setOrigin(route.origin);
        setDestination(route.destination);
        setWaypoints(route.waypoints);
        calculateRoute();
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white shrink-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
                                    <RouteIcon className="w-6 h-6" />
                                    Saved Routes
                                </h2>
                                <p className="text-indigo-100 text-sm font-medium">Quickly load your favorite long-distance journeys.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        {savedRoutes.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <RouteIcon className="w-8 h-8 text-indigo-400" />
                                </div>
                                <h3 className="text-gray-900 font-bold text-lg mb-2">No routes saved yet</h3>
                                <p className="text-gray-500 text-sm">
                                    Plan a route using the Map, set your charging stops, and click "Save" in the route details drawer to save it here.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {savedRoutes.map((route) => (
                                    <div
                                        key={route.id}
                                        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
                                    >
                                        <div
                                            className="p-4 cursor-pointer flex-1"
                                            onClick={() => handleLoadRoute(route)}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{route.name}</h3>
                                                <span className="text-xs font-semibold text-gray-400 shrink-0">
                                                    {new Date(route.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                                                <span className="truncate">{route.origin.name}</span>
                                            </div>

                                            <div className="pl-2 border-l-2 border-dashed border-gray-300 ml-2 my-1 py-1">
                                                {route.waypoints.length > 0 && (
                                                    <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        {route.waypoints.length} stops
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                                                <span className="truncate">{route.destination.name}</span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 border-t border-gray-100 p-2 flex justify-between items-center px-4">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Load Route</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteRoute(route.id);
                                                }}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
