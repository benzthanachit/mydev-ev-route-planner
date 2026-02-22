import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/utils/supabase/client';

export type ConnectorType = 'Type 2' | 'CCS2' | 'CHAdeMO' | 'Tesla';

interface EVProfileState {
    batteryCapacity: number; // kWh
    currentSoC: number; // Percentage 0-100
    maxRange: number; // km
    maxChargePowerKw: number; // kW limit of the EV
    connectorType: ConnectorType;

    // Actions
    setBatteryCapacity: (capacity: number) => void;
    setCurrentSoC: (soc: number) => void;
    setMaxRange: (range: number) => void;
    setMaxChargePowerKw: (power: number) => void;
    setConnectorType: (type: ConnectorType) => void;
    updateProfile: (updates: Partial<EVProfileState>) => void;

    // DB Sync Actions
    // DB Sync Actions
    fetchProfile: (userId: string) => Promise<void>;
    syncProfile: (userId: string) => Promise<void>;
}

// Default preset: MG4 Standard Range
export const useEVStore = create<EVProfileState>()(
    persist(
        (set, get) => ({
            batteryCapacity: 51,
            currentSoC: 80,
            maxRange: 350,
            maxChargePowerKw: 80, // Default MG4 max charge rate
            connectorType: 'CCS2',

            setBatteryCapacity: (capacity) => set({ batteryCapacity: capacity }),
            setCurrentSoC: (soc) => set({ currentSoC: soc }),
            setMaxRange: (range) => set({ maxRange: range }),
            setMaxChargePowerKw: (power) => set({ maxChargePowerKw: power }),
            setConnectorType: (type) => set({ connectorType: type }),
            updateProfile: (updates) => set((state) => ({ ...state, ...updates })),

            fetchProfile: async (userId: string) => {
                if (!userId) return;
                const supabase = createClient();

                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', userId)
                    .single() as any;

                if (error && error.code !== 'PGRST116') {
                    // PGRST116 means no rows returned, which is fine for first-time users
                    console.error('Error fetching EV profile:', error);
                    return;
                }

                if (data) {
                    // Update state without triggering another sync
                    set({
                        batteryCapacity: data.battery_capacity,
                        currentSoC: data.current_soc,
                        maxRange: data.max_range,
                        maxChargePowerKw: data.max_charge_power_kw,
                        connectorType: data.connector_type as ConnectorType,
                    });
                }
            },

            syncProfile: async (userId: string) => {
                if (!userId) return;
                const supabase = createClient();

                const state = get();
                const { error } = await supabase
                    .from('user_profiles')
                    .upsert({
                        id: userId,
                        battery_capacity: state.batteryCapacity,
                        current_soc: state.currentSoC,
                        max_range: state.maxRange,
                        max_charge_power_kw: state.maxChargePowerKw,
                        connector_type: state.connectorType,
                        updated_at: new Date().toISOString(),
                    } as any);

                if (error) {
                    console.error('Error syncing EV profile to Supabase:', error);
                    alert(`Supabase Error (${error.code}): ${error.message}\n\nPlease make sure you ran the SQL script in Supabase!`);
                }
            }
        }),
        {
            name: 'ev-profile-storage',
        }
    )
);
