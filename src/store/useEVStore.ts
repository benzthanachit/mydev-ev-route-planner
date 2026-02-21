import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConnectorType = 'Type 2' | 'CCS2' | 'CHAdeMO' | 'Tesla';

interface EVProfileState {
    batteryCapacity: number; // kWh
    currentSoC: number; // Percentage 0-100
    maxRange: number; // km
    connectorType: ConnectorType;

    // Actions
    setBatteryCapacity: (capacity: number) => void;
    setCurrentSoC: (soc: number) => void;
    setMaxRange: (range: number) => void;
    setConnectorType: (type: ConnectorType) => void;
    updateProfile: (updates: Partial<EVProfileState>) => void;
}

// Default preset: MG4 Standard Range
export const useEVStore = create<EVProfileState>()(
    persist(
        (set) => ({
            batteryCapacity: 51,
            currentSoC: 80,
            maxRange: 350,
            connectorType: 'CCS2',

            setBatteryCapacity: (capacity) => set({ batteryCapacity: capacity }),
            setCurrentSoC: (soc) => set({ currentSoC: soc }),
            setMaxRange: (range) => set({ maxRange: range }),
            setConnectorType: (type) => set({ connectorType: type }),
            updateProfile: (updates) => set((state) => ({ ...state, ...updates })),
        }),
        {
            name: 'ev-profile-storage',
        }
    )
);
