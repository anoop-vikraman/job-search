import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { PricingData, ScheduleData, ScheduleSlot, TweakAddress, TweakImage } from '../types/tweak';

export interface TweakApplication {
    userId: string;
    userName: string;
    profilePictureUrl?: string;
    userSkills: string[];
    completedCategories?: string[];
    rating?: number;
    whyPreferMessage: string;
    quotedPrice?: number;
    selectedSlots: ScheduleSlot[];
    appliedAt: string;
    status: 'pending' | 'accepted' | 'rejected';
    listerQuotedPrice?: number;
}

export interface Tweak {
    id: string;
    title: string;
    description: string;
    category: string;
    images: TweakImage[];
    audioUri: string | null;
    address: TweakAddress | null;
    skills: string[];
    languages: string[];
    schedulePreference: string;
    scheduleData: ScheduleData | null;
    pricingModel: string;
    pricingData: PricingData | null;
    tweakType: string;
    price: number;
    pricingType: string; // 'hourly' | 'quantity' | 'fixed'
    createdAt: string;
    distanceKm?: number | null; // Feed only, when the viewer shared their location
    status: 'active' | 'draft' | 'closed';
    createdByUserId: string; // Link to AuthStore user.id
    appliedBy?: string[]; // IDs of users who applied
    appliedAt?: string;   // ISO date when current user applied
    acceptedAt?: string;  // ISO date when it was accepted
    watchlistedBy?: string[]; // IDs of users who watchlisted this tweak
    applications?: TweakApplication[]; // All applications for this tweak
}

interface TweaksState {
    tweaks: Tweak[];
    addTweak: (tweak: Tweak) => void;
    updateTweak: (id: string, updates: Partial<Tweak>) => void;
    removeTweak: (id: string) => void;
    getTweakById: (id: string) => Tweak | undefined;
    getMyTweaks: (userId: string) => Tweak[];
    getAppliedTweaks: (userId: string) => Tweak[];
    getAllTweaks: (userId: string) => Tweak[];
    getDrafts: (userId: string) => Tweak[];
    clearTweaks: () => void;
    // Watchlist
    addToWatchlist: (tweakId: string, userId: string) => void;
    removeFromWatchlist: (tweakId: string, userId: string) => void;
    // Applications
    addApplication: (tweakId: string, application: TweakApplication) => void;
    updateApplicationStatus: (tweakId: string, applicantUserId: string, status: 'accepted' | 'rejected') => void;
    updateListerCounterQuote: (tweakId: string, applicantUserId: string, price: number) => void;
}

export const useTweaksStore = create<TweaksState>()(
    persist(
        (set, get) => ({
            tweaks: [],
            addTweak: (tweak) =>
                set((state) => ({
                    tweaks: [tweak, ...state.tweaks],
                })),
            updateTweak: (id, updates) =>
                set((state) => ({
                    tweaks: state.tweaks.map((t) =>
                        t.id === id ? { ...t, ...updates } : t
                    ),
                })),
            removeTweak: (id) =>
                set((state) => ({
                    tweaks: state.tweaks.filter((t) => t.id !== id),
                })),
            getTweakById: (id) => {
                return get().tweaks.find((t) => t.id === id);
            },
            getMyTweaks: (userId) => {
                return get().tweaks.filter(
                    (t) => t.createdByUserId === userId && t.status !== 'draft'
                );
            },
            getAppliedTweaks: (userId) => {
                return get().tweaks.filter(
                    (t) => t.appliedBy?.includes(userId) || false
                );
            },
            getAllTweaks: (userId) => {
                return get().tweaks.filter(
                    (t) => t.createdByUserId !== userId && t.status === 'active'
                );
            },
            getDrafts: (userId) => {
                return get().tweaks.filter(
                    (t) => t.status === 'draft' && t.createdByUserId === userId
                );
            },
            clearTweaks: () => set({ tweaks: [] }),

            // Watchlist actions
            addToWatchlist: (tweakId, userId) =>
                set((state) => ({
                    tweaks: state.tweaks.map((t) =>
                        t.id === tweakId
                            ? { ...t, watchlistedBy: [...(t.watchlistedBy || []), userId] }
                            : t
                    ),
                })),
            removeFromWatchlist: (tweakId, userId) =>
                set((state) => ({
                    tweaks: state.tweaks.map((t) =>
                        t.id === tweakId
                            ? { ...t, watchlistedBy: (t.watchlistedBy || []).filter((uid) => uid !== userId) }
                            : t
                    ),
                })),

            // Application actions
            addApplication: (tweakId, application) =>
                set((state) => ({
                    tweaks: state.tweaks.map((t) => {
                        if (t.id !== tweakId) return t;
                        const existingApps = t.applications || [];
                        // Replace if already applied
                        const filtered = existingApps.filter((a) => a.userId !== application.userId);
                        return {
                            ...t,
                            applications: [...filtered, application],
                            appliedBy: [...new Set([...(t.appliedBy || []), application.userId])],
                        };
                    }),
                })),
            updateApplicationStatus: (tweakId, applicantUserId, status) =>
                set((state) => ({
                    tweaks: state.tweaks.map((t) => {
                        if (t.id !== tweakId) return t;
                        return {
                            ...t,
                            applications: (t.applications || []).map((a) =>
                                a.userId === applicantUserId ? { ...a, status } : a
                            ),
                        };
                    }),
                })),
            updateListerCounterQuote: (tweakId, applicantUserId, price) =>
                set((state) => ({
                    tweaks: state.tweaks.map((t) => {
                        if (t.id !== tweakId) return t;
                        return {
                            ...t,
                            applications: (t.applications || []).map((a) =>
                                a.userId === applicantUserId ? { ...a, listerQuotedPrice: price } : a
                            ),
                        };
                    }),
                })),
        }),
        {
            name: 'tweaks-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
