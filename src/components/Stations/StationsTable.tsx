"use client";

import { useState } from "react";
import { GooglePlaceStation, searchStationsByQuery } from "@/services/googlePlaces";
import { MapPin, Search, Zap, ExternalLink, Star } from "lucide-react";

export default function StationsTable() {
    const [stations, setStations] = useState<GooglePlaceStation[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        setHasSearched(true);
        try {
            // Append "EV Charging Station in" to assure we get the right place type
            const query = `EV Charging Station in ${searchQuery}`;
            const results = await searchStationsByQuery(query);
            setStations(results);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6">

            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
                        <Zap className="w-8 h-8 text-blue-600" />
                        Charging Stations
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Powered by Google Maps Places API
                    </p>
                </div>

                <form onSubmit={handleSearch} className="relative w-full md:w-[450px] flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Enter a city or province (e.g., Bangkok, Phuket)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border-2 border-gray-100 text-gray-900 font-medium rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-colors shadow-sm placeholder:text-gray-400"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !searchQuery.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 rounded-2xl transition-all shadow-md active:scale-95 whitespace-nowrap"
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-700">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                            <tr>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">Station Name</th>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">Rating</th>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">Address</th>
                                <th scope="col" className="px-6 py-5 text-right font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                                            <span className="font-semibold">Searching Google Maps...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : !hasSearched ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                                        <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-lg font-medium text-gray-600">Search for an area to find EV stations</p>
                                        <p className="text-sm">e.g. "Chiang Mai", "Phuket", "Rama 9"</p>
                                    </td>
                                </tr>
                            ) : stations.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                                        No stations found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                stations.map((station) => (
                                    <tr key={station.id} className="bg-white hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-5 font-bold text-gray-900 max-w-[250px] truncate" title={station.displayName?.text}>
                                            {station.displayName?.text || "Unknown Station"}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-amber-500 font-bold flex items-center gap-1.5 mt-0.5">
                                            <Star className="w-4 h-4 fill-amber-500" />
                                            {station.rating ? station.rating.toFixed(1) : "-"}
                                            <span className="text-gray-400 font-normal text-xs">
                                                ({station.userRatingCount || 0})
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-gray-500 max-w-[350px] truncate" title={station.formattedAddress}>
                                            {station.formattedAddress || "-"}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${station.location.latitude},${station.location.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-sm font-bold bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white py-2 px-4 rounded-xl transition-all shadow-sm"
                                            >
                                                <MapPin className="w-4 h-4" />
                                                Maps
                                                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
