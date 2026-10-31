import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { devicesApi, type DevicePlatform } from '../api/devices';
import { secureStorage } from './storage';

const PUSH_TOKEN_KEY = 'push_token';
export const ANDROID_CHANNEL_ID = 'default';

/** EAS project id from app config (`extra.eas.projectId`, set via EAS_PROJECT_ID). */
function easProjectId(): string | undefined {
    const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
    return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/**
 * Ask for permission and return this install's Expo push token, or null when push is
 * unavailable (simulator/emulator, permission denied, or no EAS project id configured).
 */
export async function getExpoPushToken(): Promise<string | null> {
    if (Platform.OS === 'web' || !Device.isDevice) return null;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
            name: 'Default',
            importance: Notifications.AndroidImportance.HIGH,
        });
    }

    const existing = await Notifications.getPermissionsAsync();
    const status =
        existing.status === 'granted'
            ? existing.status
            : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    const projectId = easProjectId();
    if (!projectId) {
        console.warn('Push disabled: set EAS_PROJECT_ID so app.config.ts exposes extra.eas.projectId.');
        return null;
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
}

/** Register this device for the signed-in user. Safe to call on every login/launch. */
export async function registerForPush(): Promise<void> {
    try {
        const token = await getExpoPushToken();
        if (!token) return;
        await devicesApi.register({ token, platform: Platform.OS as DevicePlatform });
        await secureStorage.save(PUSH_TOKEN_KEY, token);
    } catch (e) {
        console.warn('Push registration failed', e);
    }
}

/** Stop pushes to this device for the current user. Call before clearing auth tokens. */
export async function unregisterFromPush(): Promise<void> {
    const token = await secureStorage.get(PUSH_TOKEN_KEY);
    if (!token) return;
    await secureStorage.delete(PUSH_TOKEN_KEY);
    try {
        await devicesApi.unregister(token);
    } catch {
        // Already removed server-side (e.g. pruned as unregistered); nothing to do.
    }
}
