import api from '../utils/api';

export type DevicePlatform = 'ios' | 'android' | 'web';

export interface RegisterDeviceRequest {
    token: string;
    platform: DevicePlatform;
}

export interface Device {
    id: string;
    token: string;
    platform: DevicePlatform;
    created_at: string;
    last_seen_at: string;
}

export const devicesApi = {
    /** Idempotent: re-registering a known token returns 200 and reassigns it to the caller. */
    register: async (data: RegisterDeviceRequest): Promise<Device> => {
        const res = await api.post('/api/v1/devices', data);
        return res.data;
    },
    unregister: async (token: string): Promise<void> => {
        await api.delete(`/api/v1/devices/${encodeURIComponent(token)}`);
    },
};
