import { StandardInput } from '@/components/UI/StandardInput';
import { Toast } from '@/components/UI/ToastManager';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { authApi } from '../../api/auth';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CustomButton from '../../components/UI/CustomButton';
import { useAuthStore } from '../../store/useAuthStore';

export default function OTPPage(): React.JSX.Element {
    const router = useRouter();
    const params = useLocalSearchParams();
    const signup = useAuthStore((state) => state.signup);

    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        const mobile = params.mobile as string;
        const countryCode = params.countryCode as string;
        const flow = params.flow as string;

        setIsLoading(true);
        try {
            await authApi.verifyOtp({
                country_code: countryCode,
                phone_number: mobile,
                otp,
                request_type: flow === 'reset' ? 'FORGOT_PASSWORD' : 'SIGNUP',
            });

            if (flow === 'signup') {
                await signup({
                    country_code: countryCode,
                    phone_number: mobile,
                    password: params.password as string,
                    first_name: params.firstName as string,
                    last_name: params.lastName as string,
                    email: params.email as string,
                });
                Toast.success("Verification successful!");
                router.replace('/(tabs)');
            } else {
                router.replace({
                    pathname: '/auth/create-password',
                    params: { flow: 'reset', mobile, countryCode },
                });
            }
        } catch (error) {
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
            </View>
        </ScreenWrapper>
    );
}
