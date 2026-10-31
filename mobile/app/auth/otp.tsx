import { StandardInput } from '@/components/UI/StandardInput';
import { Toast } from '@/components/UI/ToastManager';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CustomButton from '../../components/UI/CustomButton';
import { useAuthStore } from '../../store/useAuthStore';

export default function OTPPage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const login = useAuthStore((state) => state.login);
    
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (otp !== '000000') {
            Toast.error("Invalid OTP. Try 000000");
            return;
        }

        setIsLoading(true);
        try {
            // Auto-login after OTP success using credentials passed in params
            const success = await login(
                params.mobile as string,
                params.countryCode as string,
                params.password as string
            );

            if (success) {
                Toast.success("Verification successful!");
                router.replace('/(tabs)');
            } else {
                Toast.error("Login after verification failed");
                router.replace('/login');
            }
        } catch (error) {
            console.error(error);
            Toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper contentContainerStyle={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
            <View className="mb-10 items-center">
                <Text className="text-3xl font-bold text-text mb-2">Verify Mobile</Text>
                <Text className="text-base text-textSecondary text-center">
                    Enter the code sent to {params.countryCode} {params.mobile}
                </Text>
            </View>

            <View className="gap-6">
                <StandardInput
                    label="Verification Code"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                />

                <CustomButton onPress={handleSubmit} loading={isLoading}>
                    Verify & Continue
                </CustomButton>
                
                <Text className="text-center text-xs text-gray-400">
                    Hint: Use 000000 for verification
                </Text>
            </View>
        </ScreenWrapper>
    );
}
