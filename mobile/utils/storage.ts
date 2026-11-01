import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';

// Initialize MMKV with Fallback
let mmkv: MMKV | null = null;
let useFallback = false;

try {
    mmkv = new MMKV();
} catch (e) {
    // MMKV v3 is a C++ TurboModule and needs a dev/standalone build with the New
    // Architecture; a web build or a misconfigured native build lands here.
    console.warn('MMKV failed to initialize; falling back to in-memory storage. Persistence is disabled.', e);
    useFallback = true;
}

// In-Memory Fallback Implementation
const memoryStorage = new Map<string, string | boolean | number>();

// MMKV Storage Helper (Synchronous)
export const storage = {
    set: (key: string, value: string | boolean | number): void => {
        if (!useFallback && mmkv) {
            mmkv.set(key, value);
        } else {
            memoryStorage.set(key, value);
        }
    },
    getString: (key: string): string | undefined => {
        if (!useFallback && mmkv) {
            return mmkv.getString(key);
        }
        return memoryStorage.get(key) as string | undefined;
    },
    getNumber: (key: string): number | undefined => {
        if (!useFallback && mmkv) {
            return mmkv.getNumber(key);
        }
        return memoryStorage.get(key) as number | undefined;
    },
    getBoolean: (key: string): boolean | undefined => {
        if (!useFallback && mmkv) {
            return mmkv.getBoolean(key);
        }
        return memoryStorage.get(key) as boolean | undefined;
    },
    delete: (key: string): void => {
        if (!useFallback && mmkv) {
            mmkv.delete(key);
        } else {
            memoryStorage.delete(key);
        }
    },
    clearAll: (): void => {
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
    save: async (key: string, value: string): Promise<void> => {
        await SecureStore.setItemAsync(key, value);
    },
    get: async (key: string): Promise<string | null> => {
        return await SecureStore.getItemAsync(key);
    },
    delete: async (key: string): Promise<void> => {
        await SecureStore.deleteItemAsync(key);
    }
};