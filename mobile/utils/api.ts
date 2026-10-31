import axios from 'axios';
import { Toast } from '../components/UI/ToastManager';
import { config as appConfig } from './config';
import { secureStorage } from './storage';

// Store callback registry to break circular dependencies
let logoutHandler: (() => void) | null = null;
export const registerLogoutHandler = (handler: (() => void)) => {
    logoutHandler = handler;
};

// Base API Configuration
const api = axios.create({
    baseURL: appConfig.API_URL,
    timeout: appConfig.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    async (config) => {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
        // Attach Token
        const token = await secureStorage.get('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error(`[API Request Error]`, error);
        return Promise.reject(error);
    }
);

// Response Interceptor
api.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        console.error(`[API Response Error] ${error.response?.status} ${originalRequest?.url}`, error.response?.data || error.message);

        // Handle No Internet
        if (!error.response && error.code === 'ERR_NETWORK') {
            Toast.error("Network Error: Please check your internet connection.");
            return Promise.reject(new Error('Network Error: Please check your connection.'));
        }

        // Handle 401 Unauthorized (Token Expiration)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Attempt to Refresh Token
                const refreshToken = await secureStorage.get('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Call refresh API directly with new axios instance to avoid loops
                console.log(`[API Refresh] Attempting to refresh token...`);
                const response = await axios.post(`${appConfig.API_URL}/auth/refreshToken`, {
                    refreshToken: refreshToken
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;
                console.log(`[API Refresh] Success!`);

                // Save new tokens
                await secureStorage.save('access_token', accessToken);
                if (newRefreshToken) await secureStorage.save('refresh_token', newRefreshToken);

                // Setup header for retry
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                return api(originalRequest);
            } catch (refreshError) {
                console.error(`[API Refresh Error] Failed to refresh token`, refreshError);
                // If refresh fails, trigger logout through the registered handler
                if (logoutHandler) {
                    logoutHandler();
                } else {
                    // Fallback: just clear tokens
                    await secureStorage.delete('access_token');
                    await secureStorage.delete('refresh_token');
                }
                return Promise.reject(refreshError);
            }
        }

        // Global Error Handling Priority: errorMessage > "Something went wrong"
        const backendMessage = error.response?.data?.errorMessage || error.response?.data?.message;
        const finalMessage = backendMessage || "Something went wrong. Please try again.";

        Toast.error(finalMessage);

        return Promise.reject(error);
    }
);

export default api;
