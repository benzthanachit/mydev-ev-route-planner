"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import AuthModal from "./AuthModal";

export default function AuthButton() {
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // Supabase memory storage doesn't deadlock, so we can await securely
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;
                if (mounted) {
                    setUser(session?.user ?? null);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Auth session error:", err);
                if (mounted) {
                    setUser(null);
                    setIsLoading(false);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
            if (!mounted) return;
            setUser(session?.user ?? null);
            setIsLoading(false);

            if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
                // When auth state changes to logged in, fetch from DB
                const { useEVStore } = await import('@/store/useEVStore');
                await useEVStore.getState().fetchProfile(session.user.id);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []); // Empty dependency array ensures it strictly runs once on mount

    const handleLogout = async () => {
        setIsLoading(true);
        setIsDropdownOpen(false);
        try {
            await supabase.auth.signOut();
            setUser(null);

            // Clear local stores as a precaution
            localStorage.removeItem('ev-profile-storage');
            localStorage.removeItem('ev-route-storage');

            // Reload the page to clear any remaining in-memory state
            window.location.reload();
        } catch (err: any) {
            console.error("Error logging out:", err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-10 w-10 bg-gray-800/50 animate-pulse rounded-full border border-gray-700"></div>
        );
    }

    if (user) {
        return (
            <div className="relative group">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-gray-800 text-white hover:bg-gray-800 transition-colors"
                >
                    {user.user_metadata?.avatar_url ? (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt="Profile"
                            className="w-7 h-7 rounded-full"
                        />
                    ) : (
                        <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                    )}
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden transform transition-all duration-200 origin-top-right">
                        <div className="px-4 py-3 border-b border-gray-800">
                            <p className="text-sm font-medium text-white truncate">{user.user_metadata?.full_name || 'User'}</p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsDropdownOpen(false);
                                handleLogout();
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-md px-3 py-2 rounded-full shadow-lg border border-gray-800 text-white hover:bg-indigo-600 hover:border-indigo-500 transition-colors"
                title="Sign in to save profile"
            >
                <LogIn className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-medium pr-1 hidden sm:inline">Sign In</span>
            </button>
            <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
