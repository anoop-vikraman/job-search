import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ContactDetails {
    email: string;
    mobileNumber: string;
    countryCode: string;
    alternateMobileNumber?: string;
    alternateCountryCode?: string;
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    contactDetails: ContactDetails;
    password?: string; // Storing for testing purposes
    profilePictureUrl?: string;
    bio?: string;
    userType: string;
    isActive: boolean;
    skills?: string[]; // Skills listed on user profile (for skill matching)
    completedCategories?: string[]; // Categories of tweaks user has previously completed
    rating?: number; // Overall user rating (1-5)
}

export interface AuthState {
    user: User | null;
    allUsers: User[]; // Local database of registered users
    isAuthenticated: boolean;

    // Actions
    login: (mobileNumber: string, countryCode: string, password: string) => Promise<boolean>;
    signup: (user: Partial<User>) => Promise<void>;
    logout: () => void;
    switchUser: (userId: string) => void;
    updateUser: (data: Partial<User>) => void;
    clearUsers: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            allUsers: [],
            isAuthenticated: false,

            login: async (mobileNumber, countryCode, password) => {
                const user = get().allUsers.find(
                    u => u.contactDetails.mobileNumber === mobileNumber && 
                         u.contactDetails.countryCode === countryCode &&
                         u.password === password
                );

                if (user) {
                    set({ user, isAuthenticated: true });
                    return true;
                }
                return false;
            },

            signup: async (userData) => {
                const newUser: User = {
                    id: Math.random().toString(36).substring(7),
                    firstName: userData.firstName || 'Guest',
                    lastName: userData.lastName || '',
                    contactDetails: userData.contactDetails!,
                    password: userData.password,
                    userType: 'provider',
                    isActive: true,
                    ...userData
                };

                set((state) => ({
                    allUsers: [...state.allUsers, newUser]
                }));
            },

            logout: () => {
                set({ user: null, isAuthenticated: false });
            },

            switchUser: (userId) => {
                const user = get().allUsers.find(u => u.id === userId);
                if (user) {
                    set({ user, isAuthenticated: true });
                }
            },

            updateUser: (data) => {
                set((state) => {
                    if (!state.user) return state;
                    const updatedUser = { ...state.user, ...data };
                    const updatedUsers = state.allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
                    return { user: updatedUser, allUsers: updatedUsers };
                });
            },

            clearUsers: () => set({ allUsers: [], user: null, isAuthenticated: false }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
