import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LocationPoint } from './useRouteStore';

export interface SavedRoute {
    id: string;
    name: string;
    origin: LocationPoint;
    destination: LocationPoint;
    waypoints: LocationPoint[];
    createdAt: number;
}

interface SavedRoutesState {
    savedRoutes: SavedRoute[];
    saveRoute: (route: Omit<SavedRoute, 'id' | 'createdAt'>) => void;
    deleteRoute: (id: string) => void;
}

export const useSavedRoutesStore = create<SavedRoutesState>()(
    persist(
        (set) => ({
            savedRoutes: [],
            saveRoute: (route) => set((state) => ({
                savedRoutes: [
                    ...state.savedRoutes,
                    {
                        ...route,
                        id: crypto.randomUUID(),
                        createdAt: Date.now()
                    }
                ]
            })),
            deleteRoute: (id) => set((state) => ({
                savedRoutes: state.savedRoutes.filter(r => r.id !== id)
            })),
        }),
        {
            name: 'ev-saved-routes-storage',
        }
    )
);
