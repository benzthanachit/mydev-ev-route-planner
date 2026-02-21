"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Map, { MapRef, Marker, NavigationControl, GeolocateControl, Source, Layer, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouteStore } from "@/store/useRouteStore";
import { Navigation, MapPin, Zap, Star } from "lucide-react";
import { getStationsInBounds } from "@/services/googlePlaces";
import { useEVStore } from "@/store/useEVStore";
import turfDistance from "@turf/distance";
import { point } from "@turf/helpers";

export default function MapView() {
    const mapRef = useRef<MapRef>(null);
    const {
        origin, destination, routeCoordinates, chargingWaypoints,
        viewportStations, setViewportStations, recommendedStationIds,
        addSelectedWaypoint, removeSelectedWaypoint, selectedWaypoints, calculateRoute
    } = useRouteStore();

    const { currentSoC, maxRange } = useEVStore();

    const [viewState, setViewState] = useState({
        longitude: 100.4682, // Default Thailand (Hat Yai approx: 100.4682, 7.0086)
        latitude: 7.0086,
        zoom: 12,
    });

    const [hoverInfo, setHoverInfo] = useState<{
        longitude: number;
        latitude: number;
        station: any;
    } | null>(null);

    // Fetch stations on mount and on map move end
    const fetchViewportStations = useCallback(async () => {
        // If a route is active, we don't fetch viewport stations (we show 10km filtered ones)
        if (routeCoordinates || !mapRef.current) return;

        const bounds = mapRef.current.getBounds();
        if (!bounds) return;

        const bboxObj = {
            minLng: bounds.getWest(),
            minLat: bounds.getSouth(),
            maxLng: bounds.getEast(),
            maxLat: bounds.getNorth(),
        };

        const stations = await getStationsInBounds(bboxObj);
        setViewportStations(stations);
    }, [routeCoordinates, setViewportStations]);

    // Initial fetch
    useEffect(() => {
        const timeout = setTimeout(fetchViewportStations, 1000);
        return () => clearTimeout(timeout);
    }, [fetchViewportStations]);

    // Debounce map move
    const moveTimeout = useRef<any>(null);
    const onMoveEnd = useCallback(() => {
        if (moveTimeout.current) clearTimeout(moveTimeout.current);
        moveTimeout.current = setTimeout(() => {
            fetchViewportStations();
        }, 800);
    }, [fetchViewportStations]);

    // Click handler for map features
    const onClick = useCallback((event: any) => {
        const feature = event.features?.[0];
        if (feature) {
            if (feature.layer.id === 'clusters') {
                const clusterId = feature.properties?.cluster_id;
                const mapboxSource = mapRef.current?.getSource('stations') as any;

                mapboxSource.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                    if (err) return;
                    mapRef.current?.easeTo({
                        center: (feature.geometry as any).coordinates,
                        zoom,
                        duration: 500
                    });
                });
            } else if (feature.layer.id === 'unclustered-point') {
                const stationProps = JSON.parse(feature.properties?.stationData || "{}");
                setHoverInfo({
                    longitude: (feature.geometry as any).coordinates[0],
                    latitude: (feature.geometry as any).coordinates[1],
                    station: stationProps
                });
            }
        } else {
            setHoverInfo(null); // Clicked on empty map
        }
    }, []);

    // Cursor style
    const [cursor, setCursor] = useState("auto");
    const onMouseEnter = useCallback(() => setCursor("pointer"), []);
    const onMouseLeave = useCallback(() => setCursor("auto"), []);

    // Automatically zoom to fit route when drawn
    useEffect(() => {
        if (routeCoordinates && routeCoordinates.length > 0 && mapRef.current) {
            const bounds = routeCoordinates.reduce((acc, coord) => {
                return [
                    [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
                    [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])]
                ];
            }, [[routeCoordinates[0][0], routeCoordinates[0][1]], [routeCoordinates[0][0], routeCoordinates[0][1]]]);

            mapRef.current.fitBounds(bounds as [[number, number], [number, number]], { padding: 50, duration: 1000 });
        }
    }, [routeCoordinates]);

    const routeGeoJSON = useMemo(() => {
        if (!routeCoordinates) return null;
        return {
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: routeCoordinates
            }
        };
    }, [routeCoordinates]);

    const hoverEstSoC = useMemo(() => {
        if (!hoverInfo || !origin) return null;

        const hasWaypoints = selectedWaypoints.length > 0;
        const startSoC = hasWaypoints ? 80 : currentSoC;
        const refCoord = hasWaypoints
            ? selectedWaypoints[selectedWaypoints.length - 1].coordinates
            : origin.coordinates;

        // Assuming ~1.2x routing factor over straight line distance
        const distKm = turfDistance(
            point(refCoord),
            point([hoverInfo.longitude, hoverInfo.latitude]),
            { units: 'kilometers' } as any
        ) * 1.2;

        const socDrop = (distKm / maxRange) * 100;
        return Math.round(startSoC - socDrop);
    }, [hoverInfo, origin, selectedWaypoints, currentSoC, maxRange]);

    // Stations GeoJSON for Clustering
    const stationsGeoJSON = useMemo(() => {
        const sourceStations = routeCoordinates ? chargingWaypoints : viewportStations;

        return {
            type: "FeatureCollection",
            features: sourceStations.map(st => {
                const isLocationPoint = (st as any).coordinates !== undefined;
                const lng = isLocationPoint ? (st as any).coordinates[0] : (st as any).location.longitude;
                const lat = isLocationPoint ? (st as any).coordinates[1] : (st as any).location.latitude;
                const name = isLocationPoint ? (st as any).name : (st as any).displayName?.text;
                const id = isLocationPoint ? (st as any).googleStationId : (st as any).id;

                const isRecommended = recommendedStationIds.includes(id);
                const isSelected = selectedWaypoints.some(wp => wp.googleStationId === id);

                return {
                    type: "Feature",
                    properties: {
                        stationData: JSON.stringify(st),
                        name: name,
                        isRecommended,
                        isSelected
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    }
                };
            })
        };
    }, [viewportStations, chargingWaypoints, routeCoordinates, recommendedStationIds, selectedWaypoints]);

    return (
        <div className="relative w-full h-[100dvh]">
            <Map
                {...viewState}
                ref={mapRef}
                onMove={(evt: any) => setViewState(evt.viewState)}
                onMoveEnd={onMoveEnd}
                onClick={onClick}
                interactiveLayerIds={['clusters', 'unclustered-point']}
                cursor={cursor}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                style={{ width: "100%", height: "100%" }}
            >
                <GeolocateControl position="top-right" trackUserLocation />
                <NavigationControl position="top-right" />

                {/* Draw Route Line */}
                {routeGeoJSON && (
                    <Source id="routeLine" type="geojson" data={routeGeoJSON as any}>
                        <Layer
                            id="routeLayer"
                            type="line"
                            paint={{
                                "line-color": "#3b82f6", // Blue-500
                                "line-width": 4,
                                "line-opacity": 0.8
                            }}
                        />
                    </Source>
                )}

                {/* Draw Stations (Clustered or Unclustered) */}
                <Source
                    id="stations"
                    type="geojson"
                    data={stationsGeoJSON as any}
                    cluster={true}
                    clusterMaxZoom={14}
                    clusterRadius={50}
                >
                    <Layer
                        id="clusters"
                        type="circle"
                        filter={['has', 'point_count']}
                        paint={{
                            'circle-color': ['step', ['get', 'point_count'], '#10b981', 10, '#f59e0b', 50, '#ef4444'],
                            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#fff'
                        }}
                    />
                    <Layer
                        id="cluster-count"
                        type="symbol"
                        filter={['has', 'point_count']}
                        layout={{
                            'text-field': '{point_count_abbreviated}',
                            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                            'text-size': 14,
                        }}
                        paint={{
                            'text-color': '#ffffff'
                        }}
                    />
                    <Layer
                        id="unclustered-point"
                        type="circle"
                        filter={['!', ['has', 'point_count']]}
                        paint={{
                            'circle-color': [
                                'case',
                                ['==', ['get', 'isSelected'], true], '#3b82f6', // blue-500
                                ['==', ['get', 'isRecommended'], true], '#f59e0b', // amber-500
                                '#10b981' // emerald-500
                            ],
                            'circle-radius': [
                                'case',
                                ['==', ['get', 'isSelected'], true], 10,
                                ['==', ['get', 'isRecommended'], true], 10,
                                8
                            ],
                            'circle-stroke-width': [
                                'case',
                                ['==', ['get', 'isRecommended'], true], 3,
                                2
                            ],
                            'circle-stroke-color': '#fff'
                        }}
                    />
                </Source>

                {/* Popup for unclustered clicked Stations */}
                {hoverInfo && (
                    <Popup
                        longitude={hoverInfo.longitude}
                        latitude={hoverInfo.latitude}
                        anchor="bottom"
                        onClose={() => setHoverInfo(null)}
                        closeOnClick={false}
                        className="rounded-xl overflow-hidden shadow-2xl"
                        maxWidth="300px"
                    >
                        <div className="p-3 text-gray-900 flex flex-col gap-2">
                            <h3 className="font-bold text-base leading-tight">
                                {hoverInfo.station.displayName?.text || hoverInfo.station.name}
                            </h3>

                            {hoverInfo.station.formattedAddress && (
                                <p className="text-sm text-gray-500 line-clamp-2">
                                    {hoverInfo.station.formattedAddress}
                                </p>
                            )}

                            {hoverInfo.station.rating && (
                                <div className="flex items-center gap-1 mt-1 text-sm font-bold text-amber-500">
                                    <Star className="w-4 h-4 fill-amber-500" />
                                    {hoverInfo.station.rating.toFixed(1)}
                                    <span className="text-gray-400 font-normal ml-1">({hoverInfo.station.userRatingCount || 0})</span>
                                </div>
                            )}

                            {/* Battery Prediction */}
                            {hoverEstSoC !== null && (
                                <div className={`flex items-start gap-2 mt-2 text-sm font-bold p-2.5 rounded-xl border ${hoverEstSoC < 0 ? 'bg-red-50 text-red-600 border-red-100' :
                                        hoverEstSoC < 20 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    }`}>
                                    <Zap className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span className="leading-tight">
                                        {hoverEstSoC < 0
                                            ? 'Too far! Not enough battery to reach this station.'
                                            : `Est. Arrival Battery: ~${hoverEstSoC}%`}
                                    </span>
                                </div>
                            )}

                            {/* Add/Remove Waypoint Button */}
                            {routeCoordinates && (
                                <div className="pt-2 border-t border-gray-100 mt-1">
                                    {selectedWaypoints.some(wp => wp.googleStationId === (hoverInfo.station.id || hoverInfo.station.googleStationId)) ? (
                                        <button
                                            onClick={() => {
                                                removeSelectedWaypoint(hoverInfo.station.id || hoverInfo.station.googleStationId);
                                                setHoverInfo(null);
                                                calculateRoute();
                                            }}
                                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-xl transition-colors text-sm"
                                        >
                                            Remove Stop
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                addSelectedWaypoint({
                                                    name: hoverInfo.station.displayName?.text || hoverInfo.station.name,
                                                    coordinates: [hoverInfo.longitude, hoverInfo.latitude],
                                                    googleStationId: hoverInfo.station.id || hoverInfo.station.googleStationId
                                                });
                                                setHoverInfo(null);
                                                calculateRoute();
                                            }}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl transition-colors shadow-md text-sm"
                                        >
                                            Add to Route
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </Popup>
                )}

                {/* Draw Origin Marker */}
                {origin && (
                    <Marker longitude={origin.coordinates[0]} latitude={origin.coordinates[1]} anchor="bottom">
                        <div className="bg-blue-600 text-white p-2 rounded-full border-2 border-white shadow-lg shadow-blue-500/50">
                            <Navigation className="w-4 h-4" />
                        </div>
                    </Marker>
                )}

                {/* Draw Destination Marker */}
                {destination && (
                    <Marker longitude={destination.coordinates[0]} latitude={destination.coordinates[1]} anchor="bottom">
                        <div className="bg-red-500 text-white p-2 rounded-full border-2 border-white shadow-lg shadow-red-500/50">
                            <MapPin className="w-4 h-4" />
                        </div>
                    </Marker>
                )}
            </Map>
        </div>
    );
}
