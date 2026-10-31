// API base URL is environment-aware. Set EXPO_PUBLIC_API_URL to override the
// default (e.g. for local backend development use http://localhost:8000).
const DEFAULT_API_URL = 'https://tweak-be-users-886709876090.us-central1.run.app';

export const config = {
    API_URL: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
    TIMEOUT: 15000,
};
