import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { authApi, LoginRequest, SignupRequest } from '../api/auth';
import { userApi } from '../api/user';
import { unregisterFromPush } from '../utils/push';
import { secureStorage } from '../utils/storage';

interface ContactDetails {
    email?: string;
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
    profilePictureUrl?: string;
    bio?: string;
    dateOfBirth?: string;
    gender?: string;
    userType: string;
    isActive: boolean;
    skills?: string[];
    completedCategories?: string[];
    rating?: number;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;

    login: (data: LoginRequest) => Promise<void>;
    signup: (data: SignupRequest) => Promise<void>;
    logout: () => Promise<void>;
    loadCurrentUser: () => Promise<void>;
    updateUser: (data: Partial<User>) => void;
    setUser: (user: User) => void;
}

// Map a backend user payload to the in-app User shape.
const toUser = (u: Awaited<ReturnType<typeof userApi.getMe>>): User => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name ?? '',
    contactDetails: {
        email: u.email,
        mobileNumber: u.phone_number,
        countryCode: u.country_code,
    },
    profilePictureUrl: u.profile_picture_url,
    bio: u.bio,
    dateOfBirth: u.date_of_birth,
    gender: u.gender,
    userType: 'user',
    isActive: true,
    skills: u.skills,
    completedCategories: u.completed_categories,
    rating: u.rating_avg,
});

const persistTokens = async (tokens: { access_token: string; refresh_token: string }) => {
    await secureStorage.save('access_token', tokens.access_token);
    await secureStorage.save('refresh_token', tokens.refresh_token);
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,

            login: async (data) => {
                const tokens = await authApi.login(data);
                await persistTokens(tokens);
                const profile = await userApi.getMe();
                set({ user: toUser(profile), isAuthenticated: true });
            },

            signup: async (data) => {
                const tokens = await authApi.signup(data);
                await persistTokens(tokens);
                const profile = await userApi.getMe();
                set({ user: toUser(profile), isAuthenticated: true });
            },

            logout: async () => {
                // Needs the access token, so it runs before the session is cleared.
                await unregisterFromPush();
                try {
                    await authApi.logout();
                } catch {
                    // Even if the server call fails, clear local session.
                }
                await secureStorage.delete('access_token');
                await secureStorage.delete('refresh_token');
                set({ user: null, isAuthenticated: false });
            },

            loadCurrentUser: async () => {
                const token = await secureStorage.get('access_token');
                if (!token) {
                    set({ user: null, isAuthenticated: false });
                    return;
                }
                const profile = await userApi.getMe();
                set({ user: toUser(profile), isAuthenticated: true });
            },

            updateUser: (data) => {
                set((state) => {
                    if (!state.user) return state;
                    return { user: { ...state.user, ...data } };
                });
            },

            setUser: (user) => set({ user, isAuthenticated: true }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Only cache non-sensitive profile data; tokens live in secure-store.
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);
