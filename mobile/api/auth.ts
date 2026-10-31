import { secureStorage } from '../utils/storage';

export const authApi = {
    // 1. API for Login
    login: async (data: any) => {
        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (data.mobileNumber === '0000000000' && data.password === 'Tweak@123') {
            return {
                data: {
                    accessToken: 'mock_access_token_12345',
                    refreshToken: 'mock_refresh_token_67890',
                    user: {
                        id: 1,
                        name: 'Test User',
                        mobileNumber: '0000000000'
                    }
                },
                // Keep the structure consistent with how the app expects it (response.data usually)
                // But looking at login.tsx: response.accessToken -> implies the api method returns the data directly.
                accessToken: 'mock_access_token_12345',
                refreshToken: 'mock_refresh_token_67890',
            };
        }
        throw new Error('Invalid credentials');
    },

    // 2. API for signup
    register: async (data: any) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            message: 'User registered successfully'
        };
    },

    // 3. For token refresh
    refreshToken: async (refreshToken: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            accessToken: 'new_mock_access_token_' + Date.now(),
            refreshToken: 'new_mock_refresh_token_' + Date.now()
        };
    },

    // 4. Validating password
    validatePassword: async (data: { password: string, confirmPassword: string }) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (data.password === data.confirmPassword) {
            return { success: true };
        }
        throw new Error('Passwords do not match');
    },

    // 5. For log out
    logout: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await secureStorage.delete('refresh_token');
    },

    // 6. To log out from all devices
    logoutAll: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await secureStorage.delete('refresh_token');
    },

    // 7. To generate otp
    generateOTP: async (data: { mobileNumber: string, countryCode: string, requestType: string }) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (data.mobileNumber === '0000000000') {
            return { success: true, message: 'OTP Sent' };
        }
        // Be lenient for now or strict? User said "only allow the number... to pass".
        // Assuming other numbers fail or just don't work for login.
        // For OTP generation, typically we allow it to "send" for others too or just fail them?
        // User said "in case of login only allow...". "pass" implies everything else fails.
        // However, for generateOTP, if we fail everything else, they can't even get to the next screen?
        // Let's allow 0000000000 specifically.
        // Actually, user said "in case of login only allow...".
        // Maybe for generateOTP we should also restrict?
        // "only allow the number 0000000000 to pass and the otp 000000"
        return { success: true, message: 'OTP Sent' };
    },

    // 8. Validate the otp
    validateOTP: async (data: { key?: string, OTPCode?: string, otp?: string }) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        // api signature was { key: string, OTPCode: string }
        // check-mobile.tsx might send different args? No, usually follows api definition.

        // Handling both potential naming conventions just in case, but adhering to signature
        const code = data.OTPCode || data.otp;
        if (code === '000000') {
            return {
                success: true,
                // Some flows might return a token on OTP validation (like login with OTP)
                // But here it seems to be just validation
            };
        }
        throw new Error('Invalid OTP');
    }
};
