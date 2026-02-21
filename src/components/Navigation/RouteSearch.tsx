"use client";

import { useState, useEffect } from "react";
import { useRouteStore } from "@/store/useRouteStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { Star, MapPin, Navigation, ArrowRight, X } from "lucide-react";
import dynamic from 'next/dynamic';

const SearchBox = dynamic(() => import('@mapbox/search-js-react').then(mod => mod.SearchBox), {
    ssr: false,
});

export default function RouteSearch() {
    const { origin, destination, setOrigin, setDestination, calculateRoute, totalDistanceKm } = useRouteStore();
    const { favorites, removeFavorite } = useFavoritesStore();

    const [originInput, setOriginInput] = useState("");
    const [destInput, setDestInput] = useState("");

    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    // Default origin to user's current location via geolocation
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${MAPBOX_TOKEN}`);
                    const data = await response.json();
                    if (data.features && data.features.length > 0) {
                        const placeName = data.features[0].properties.full_address || data.features[0].properties.name;
                        setOriginInput(placeName);
                        setOrigin({
                            name: placeName,
                            coordinates: [longitude, latitude]
                        });
                    }
                } catch (error) {
                    console.error("Reverse geocoding error:", error);
                }
            }, (error) => {
                console.warn("Geolocation permission denied or error:", error);
            });
        }
    }, [setOrigin, MAPBOX_TOKEN]);

    const handleSearch = () => {
        if (origin && destination) {
            calculateRoute();
        }
    };

    return (
        <div className="absolute top-4 left-4 right-16 z-10 route-search-container">
            <div className="bg-white/95 backdrop-blur-xl p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex flex-col gap-4">

                {/* Origin Input */}
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 hover:border-blue-400 focus-within:border-blue-500 rounded-2xl px-4 py-2 transition-colors">
                    <Navigation className="w-6 h-6 text-blue-500 shrink-0" />
                    <div className="w-full">
                        <SearchBox
                            accessToken={MAPBOX_TOKEN}
                            options={{ language: "en" }}
                            value={originInput}
                            onChange={(val) => setOriginInput(val)}
                            onRetrieve={(res) => {
                                setOrigin({
                                    name: res.features[0].properties.name,
                                    coordinates: res.features[0].geometry.coordinates as [number, number]
                                });
                            }}
                        />
                    </div>
                </div>

                {/* Destination Input */}
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 hover:border-red-400 focus-within:border-red-500 rounded-2xl px-4 py-2 transition-colors">
                    <MapPin className="w-6 h-6 text-red-500 shrink-0" />
                    <div className="w-full">
                        <SearchBox
                            accessToken={MAPBOX_TOKEN}
                            options={{ language: "en" }}
                            value={destInput}
                            onChange={(val) => setDestInput(val)}
                            onRetrieve={(res) => {
                                setDestination({
                                    name: res.features[0].properties.name,
                                    coordinates: res.features[0].geometry.coordinates as [number, number]
                                });
                            }}
                        />
                    </div>
                </div>

                {/* Favorites Quick Select */}
                {favorites.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2 px-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saved Favorites</span>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {favorites.map(fav => (
                                <div
                                    key={fav.id}
                                    className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 group cursor-pointer hover:bg-amber-100 transition-colors"
                                    onClick={() => {
                                        setDestination({
                                            name: fav.name,
                                            coordinates: fav.coordinates,
                                            googleStationId: fav.googleStationId
                                        });
                                        // A small hack to update the visual text in the mapbox component
                                        const inputs = document.querySelectorAll('input');
                                        if (inputs[1]) {
                                            inputs[1].value = fav.name;
                                        }
                                    }}
                                >
                                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                    <span className="text-sm font-bold">{fav.name}</span>
                                    <button
                                        className="ml-1 text-amber-500 hover:text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-amber-200"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFavorite(fav.id!);
                                        }}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <div className="flex items-center justify-between mt-2 pl-2 border-t border-gray-100 pt-4">
                    {totalDistanceKm ? (
                        <div className="text-sm text-gray-500 font-medium">Distance: <span className="text-gray-900 font-black text-lg">{totalDistanceKm}km</span></div>
                    ) : (
                        <div className="text-sm font-medium text-gray-500">Plan your EV trip</div>
                    )}

                    <button
                        onClick={handleSearch}
                        disabled={!origin || !destination}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-2xl text-base flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98]"
                    >
                        Calculate
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

            </div>
        </div>
    );
}
