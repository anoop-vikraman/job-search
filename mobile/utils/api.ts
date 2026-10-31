import axios from 'axios';
import { Toast } from '../components/UI/ToastManager';
import { config as appConfig } from './config';
import { secureStorage } from './storage';

// Callback registry to break the api <-> auth-store circular dependency.
let logoutHandler: (() => void) | null = null;
export const registerLogoutHandler = (handler: () => void): void => {
    logoutHandler = handler;
};

const api = axios.create({
    baseURL: appConfig.API_URL,
    timeout: appConfig.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach the access token to every request.
api.interceptors.request.use(
    async (config) => {
        const token = await secureStorage.get('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Refresh-once-on-401 + global error surfacing.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (!error.response && error.code === 'ERR_NETWORK') {
            Toast.error('Network error. Please check your connection.');
            return Promise.reject(new Error('Network error. Please check your connection.'));
        }

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = await secureStorage.get('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Use a bare axios call so this request doesn't loop through the interceptor.
                const { data } = await axios.post(`${appConfig.API_URL}/api/v1/auth/refresh`, {
                    refresh_token: refreshToken,
                });

                const accessToken: string = data.access_token;
                const newRefreshToken: string | undefined = data.refresh_token;

                await secureStorage.save('access_token', accessToken);
                if (newRefreshToken) {
                    await secureStorage.save('refresh_token', newRefreshToken);
                }

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                if (logoutHandler) {
                    logoutHandler();
                } else {
                    await secureStorage.delete('access_token');
                    await secureStorage.delete('refresh_token');
                }
                return Promise.reject(refreshError);
            }
        }

        // Callers like analytics opt out of user-facing error toasts.
        if (originalRequest?.headers?.['X-Silent-Errors']) {
            return Promise.reject(error);
        }

        // Backend error envelope: { detail, code }.
        const message: string =
            error.response?.data?.detail ||
            error.response?.data?.message ||
            'Something went wrong. Please try again.';
        Toast.error(message);

        return Promise.reject(error);
    }
);

export default api;
