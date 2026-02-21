import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LocationPoint } from './useRouteStore';

export interface FavoriteLocation extends LocationPoint {
    id: string;
    createdAt: number;
}

interface FavoritesState {
    favorites: FavoriteLocation[];
    addFavorite: (location: FavoriteLocation) => void;
    removeFavorite: (id: string) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set) => ({
            favorites: [],
            addFavorite: (location) => set((state) => ({
                favorites: [...state.favorites, location]
            })),
            removeFavorite: (id) => set((state) => ({
                favorites: state.favorites.filter(f => f.id !== id)
            })),
        }),
        {
            name: 'ev-favorites-storage', // name of the item in the storage (must be unique)
        }
    )
);
