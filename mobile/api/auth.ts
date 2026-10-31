import api from '../utils/api';

// Request/response shapes follow the backend API contract (/api/v1, snake_case).

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
}

export interface LoginRequest {
    country_code: string;
    phone_number: string;
    password: string;
}

export interface SignupRequest {
    country_code: string;
    phone_number: string;
    password: string;
    first_name: string;
    last_name?: string;
    email?: string;
    date_of_birth?: string; // ISO date
    referral_code?: string;
}

export interface GenerateOtpRequest {
    country_code: string;
    phone_number: string;
    request_type: 'SIGNUP' | 'FORGOT_PASSWORD';
}

export interface VerifyOtpRequest {
    country_code: string;
    phone_number: string;
    otp: string;
    request_type: 'SIGNUP' | 'FORGOT_PASSWORD';
}

export const authApi = {
    login: async (data: LoginRequest): Promise<AuthTokens> => {
        const res = await api.post('/api/v1/auth/login', data);
        return res.data;
    },

    signup: async (data: SignupRequest): Promise<AuthTokens> => {
        const res = await api.post('/api/v1/auth/signup', data);
        return res.data;
    },

    generateOtp: async (data: GenerateOtpRequest): Promise<{ success: boolean }> => {
        const res = await api.post('/api/v1/auth/otp/generate', data);
        return res.data;
    },

    verifyOtp: async (data: VerifyOtpRequest): Promise<{ success: boolean }> => {
        const res = await api.post('/api/v1/auth/otp/verify', data);
        return res.data;
    },

    logout: async (): Promise<void> => {
        await api.post('/api/v1/auth/logout');
    },
};
