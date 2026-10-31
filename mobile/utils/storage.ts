import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';

// Initialize MMKV with Fallback
let mmkv: MMKV | null = null;
let useFallback = false;

try {
    mmkv = new MMKV();
} catch (e) {
    console.warn("MMKV failed to initialize (likely running in Expo Go?). Falling back to in-memory storage.");
    useFallback = true;
}

// In-Memory Fallback Implementation
const memoryStorage = new Map<string, string | boolean | number>();

// MMKV Storage Helper (Synchronous)
export const storage = {
    set: (key: string, value: string | boolean | number) => {
        if (!useFallback && mmkv) {
            mmkv.set(key, value);
        } else {
            memoryStorage.set(key, value);
        }
    },
    getString: (key: string) => {
        if (!useFallback && mmkv) {
            return mmkv.getString(key);
        }
        return memoryStorage.get(key) as string | undefined;
    },
    getNumber: (key: string) => {
        if (!useFallback && mmkv) {
            return mmkv.getNumber(key);
        }
        return memoryStorage.get(key) as number | undefined;
    },
    getBoolean: (key: string) => {
        if (!useFallback && mmkv) {
            return mmkv.getBoolean(key);
        }
        return memoryStorage.get(key) as boolean | undefined;
    },
    delete: (key: string) => {
        if (!useFallback && mmkv) {
            mmkv.delete(key);
        } else {
            memoryStorage.delete(key);
        }
    },
    clearAll: () => {
        if (!useFallback && mmkv) {
            mmkv.clearAll();
        } else {
            memoryStorage.clear();
        }
    }
};

// Secure Store Helper (Asynchronous)
// Used for sensitive data like Auth Tokens
export const secureStorage = {
    save: async (key: string, value: string) => {
        await SecureStore.setItemAsync(key, value);
    },
    get: async (key: string) => {
        return await SecureStore.getItemAsync(key);
    },
    delete: async (key: string) => {
        await SecureStore.deleteItemAsync(key);
    }
};