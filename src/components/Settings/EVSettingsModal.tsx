"use client";

import { useState, useEffect } from "react";
import { useEVStore, ConnectorType } from "@/store/useEVStore";
import { createClient } from "@/utils/supabase/client";
import { X, Settings2, Battery, Zap, Cloud, CloudOff } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function EVSettingsModal({ isOpen, onClose }: Props) {
    const profile = useEVStore();
    const [isCloudSyncOn, setIsCloudSyncOn] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            setIsCloudSyncOn(!!session?.user);
        };
        if (isOpen) {
            checkAuth();

            // Also listen to auth changes while modal is open
            const supabase = createClient();
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
                setIsCloudSyncOn(!!session?.user);
            });
            return () => subscription.unsubscribe();
        }
    }, [isOpen]);

    // Local state for form edits
    const [batteryCapacity, setBatteryCapacity] = useState(profile.batteryCapacity);
    const [currentSoC, setCurrentSoC] = useState(profile.currentSoC);
    const [maxRange, setMaxRange] = useState(profile.maxRange);
    const [maxChargePowerKw, setMaxChargePowerKw] = useState(profile.maxChargePowerKw);
    const [connectorType, setConnectorType] = useState<ConnectorType>(profile.connectorType);

    useEffect(() => {
        if (isOpen) {
            setBatteryCapacity(profile.batteryCapacity);
            setCurrentSoC(profile.currentSoC);
            setMaxRange(profile.maxRange);
            setMaxChargePowerKw(profile.maxChargePowerKw);
            setConnectorType(profile.connectorType);
        }
    }, [isOpen, profile.batteryCapacity, profile.currentSoC, profile.maxRange, profile.maxChargePowerKw, profile.connectorType]);

    if (!isOpen) return null;

    const handleSave = async () => {
        profile.updateProfile({
            batteryCapacity,
            currentSoC,
            maxRange,
            maxChargePowerKw,
            connectorType
        });

        // Explicitly trigger cloud sync after local state is updated
        if (isCloudSyncOn) {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await profile.syncProfile(session.user.id);
            }
        }

        onClose();
    };

    const connectorOptions: ConnectorType[] = ['Type 2', 'CCS2', 'CHAdeMO', 'Tesla'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_20px_60px_rgb(0,0,0,0.15)] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <div className="flex items-center gap-2 text-gray-900 font-extrabold text-xl tracking-tight">
                            <Settings2 className="w-6 h-6 text-blue-600" />
                            EV Profile Settings
                        </div>
                        {isCloudSyncOn ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mt-1">
                                <Cloud className="w-3.5 h-3.5" />
                                Syncing to Cloud
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 mt-1">
                                <CloudOff className="w-3.5 h-3.5" />
                                Local Storage Only (Sign In to Sync)
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-full transition-all shadow-sm border border-gray-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 flex flex-col gap-8 overflow-y-auto max-h-[70vh]">

                    {/* SoC Input */}
                    <div className="flex flex-col gap-3 relative">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                            <Battery className="w-5 h-5 text-green-500" />
                            Starting Battery
                        </label>
                        <div className="flex items-center gap-5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={currentSoC}
                                onChange={(e) => setCurrentSoC(Number(e.target.value))}
                                className="flex-1 accent-green-500 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-2xl font-black text-gray-900 tabular-nums w-14 text-right">{currentSoC}%</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {/* Battery Capacity */}
                        <div className="flex flex-col gap-2 relative">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                                <Zap className="w-5 h-5 text-amber-500" />
                                Battery
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={batteryCapacity}
                                    onChange={(e) => setBatteryCapacity(Number(e.target.value))}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-lg rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:bg-white transition-colors pr-14"
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold select-none">kWh</span>
                            </div>
                        </div>

                        {/* Max Range */}
                        <div className="flex flex-col gap-2 relative">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Max Range</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={maxRange}
                                    onChange={(e) => setMaxRange(Number(e.target.value))}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-lg rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:bg-white transition-colors pr-12"
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold select-none">km</span>
                            </div>
                        </div>

                        {/* Max Charge Power */}
                        <div className="flex flex-col gap-2 relative col-span-2 sm:col-span-1">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-blue-500" />
                                Max Charge Speed
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={maxChargePowerKw}
                                    onChange={(e) => setMaxChargePowerKw(Number(e.target.value))}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-lg rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:bg-white transition-colors pr-12"
                                    placeholder="e.g. 140"
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold select-none">kW</span>
                            </div>
                        </div>
                    </div>

                    {/* Connector Type */}
                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Connector Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            {connectorOptions.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setConnectorType(type)}
                                    className={`py-4 px-4 rounded-2xl text-base font-bold transition-all ${connectorType === type
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-600'
                                        : 'bg-white text-gray-500 hover:text-gray-900 border-2 border-gray-100 hover:border-gray-200'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={handleSave}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 font-extrabold text-lg py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98]"
                    >
                        {isCloudSyncOn && <Cloud className="w-5 h-5" />}
                        Save Profile
                    </button>
                </div>

            </div>
        </div>
    );
}
