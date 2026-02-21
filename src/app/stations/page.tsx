import StationsTable from "@/components/Stations/StationsTable";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
    title: "EV Stations in Thailand",
    description: "List of all Open Charge Map stations in Thailand",
};

export default function StationsPage() {
    return (
        <main className="min-h-screen bg-gray-50 text-gray-900 selection:bg-blue-500/30">

            {/* Top Navigation */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm font-bold uppercase tracking-wider"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Map
                    </Link>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="pb-20">
                <StationsTable />
            </div>

        </main>
    );
}
