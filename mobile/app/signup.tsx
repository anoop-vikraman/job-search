import CountryCodePicker from '@/components/UI/CountryCodePicker';
import { StandardInput } from '@/components/UI/StandardInput';
import { Toast } from '@/components/UI/ToastManager';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { authApi } from '../api/auth';
import { ScreenWrapper } from '../components/ScreenWrapper';
import CustomButton from '../components/UI/CustomButton';

export default function SignUp() {
    const { t } = useTranslation();
    const router = useRouter();

    const [form, setForm] = useState({
        email: '',
        password: '',
        name: '',
        mobileNumber: '',
    });
    const [countryCode, setCountryCode] = useState('+91');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async () => {
        if (!form.mobileNumber || form.mobileNumber.length < 10) {
            Toast.error("Please enter a valid mobile number");
            return;
        }
        if (!form.password) {
            Toast.error("Password is required");
            return;
        }

        setIsLoading(true);
        try {
            await authApi.generateOtp({
                country_code: countryCode,
                phone_number: form.mobileNumber,
                request_type: 'SIGNUP',
            });

            router.push({
                pathname: '/auth/otp',
                params: {
                    mobile: form.mobileNumber,
                    countryCode: countryCode,
                    firstName: form.name.split(' ')[0],
                    lastName: form.name.split(' ').slice(1).join(' '),
                    email: form.email,
                    password: form.password,
                    flow: 'signup',
                }
            });
        } catch (error) {
            Toast.error("Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper scrollable contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'center' }}>
            <View className="mb-10 mt-10">
                <Text className="text-4xl font-bold text-primary mb-3">
                    {t('welcome')}
                </Text>
                <Text className="text-lg text-textSecondary">
                    Create an account to get started
                </Text>
            </View>

            <View className="gap-2">
                <StandardInput
                    label="Full Name"
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                    autoCapitalize="words"
                />

                <StandardInput
                    label="Mobile Number"
                    value={form.mobileNumber}
                    onChangeText={(text) => setForm({ ...form, mobileNumber: text })}
                    keyboardType="phone-pad"
                    maxLength={10}
                    leftComponent={
                        <View className="border-r border-gray-200 pr-2 mr-[-4px]">
                            <CountryCodePicker
                                selectedCode={countryCode}
                                onSelect={setCountryCode}
                            />
                        </View>
                    }
                />

                <StandardInput
                    label="Email Address (Optional)"
                    value={form.email}
                    onChangeText={(text) => setForm({ ...form, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <StandardInput
                    label="Password"
                    value={form.password}
                    onChangeText={(text) => setForm({ ...form, password: text })}
                    secureTextEntry={!isPasswordVisible}
                    rightComponent={
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} accessibilityRole="button" accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}>
                            <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
                        </TouchableOpacity>
                    }
                />

                <View className="mt-6 gap-4">
                    <CustomButton onPress={handleSignup} loading={isLoading}>
                        Sign Up
                    </CustomButton>

                    <View className="flex-row justify-center items-center">
                        <Text className="text-textSecondary">Already have an account?</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/login')}
                            className="px-2"
                        >
                            <Text className="text-primary font-bold">Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ScreenWrapper>
    );
}
