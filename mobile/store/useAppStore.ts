import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

import { AppState } from '../types/store';

const zustandStorage: StateStorage = {
    setItem: async (name, value) => {
        await AsyncStorage.setItem(name, value);
    },
    getItem: async (name) => {
        const value = await AsyncStorage.getItem(name);
        return value ?? null;
    },
    removeItem: async (name) => {
        await AsyncStorage.removeItem(name);
    },
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            language: 'en',
            setLanguage: (lang) => set({ language: lang }),
            hasFinishedOnboarding: false,
            completeOnboarding: () => set({ hasFinishedOnboarding: true }),
            savedAddresses: [],
            addAddress: (address) => set((state) => ({ savedAddresses: [...state.savedAddresses, address] })),
            removeAddress: (id) => set((state) => ({ savedAddresses: state.savedAddresses.filter((a) => a.id !== id) })),
            updateAddress: (id, address) => set((state) => ({
                savedAddresses: state.savedAddresses.map((a) => (a.id === id ? address : a)),
            })),
        }),
        {
            name: 'app-storage',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
