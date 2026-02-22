"use client";

import { useState } from "react";
import MapView from "@/components/Map/MapView";
import LiveDashboard from "@/components/Navigation/LiveDashboard";
import RouteSearch from "@/components/Navigation/RouteSearch";
import RouteBottomSheet from "@/components/RouteDetails/RouteBottomSheet";
import EVSettingsModal from "@/components/Settings/EVSettingsModal";
import AIRouteSuggestModal from "@/components/Navigation/AIRouteSuggestModal";
import { Settings, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-black flex flex-col items-center justify-between">
      {/* Map layer in the background */}
      <MapView />

      {/* Floating Route Search Panel */}
      <RouteSearch />

      {/* Floating Actions Container (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-3 items-end">
        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="bg-gray-900/80 backdrop-blur-md p-3 rounded-full shadow-lg border border-gray-800 text-white hover:bg-gray-800 transition-colors"
          title="EV Settings"
        >
          <Settings className="w-6 h-6 text-gray-400 hover:text-white" />
        </button>

        {/* Stations List Button */}
        <Link
          href="/stations"
          className="bg-gray-900/80 backdrop-blur-md p-3 rounded-full shadow-lg border border-gray-800 text-white hover:bg-emerald-600 hover:border-emerald-500 transition-colors group"
          title="All Charging Stations"
        >
          <Zap className="w-6 h-6 text-emerald-400 group-hover:text-white" />
        </Link>
      </div>

      {/* Live navigation dashboard overlay at the bottom */}
      <LiveDashboard />

      {/* Route Instructions Bottom Sheet */}
      <RouteBottomSheet />

      {/* Settings Modal */}
      <EVSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* AI Suggestion Modal */}
      <AIRouteSuggestModal />
    </main>
  );
}
