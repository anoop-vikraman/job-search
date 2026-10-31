import { StandardInput } from '@/components/UI/StandardInput';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import SourceSurveyModal from '../../components/Auth/SourceSurveyModal';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CustomButton from '../../components/UI/CustomButton';
import CustomConfirmationModal from '../../components/UI/CustomConfirmationModal';
import CustomDatePicker from '../../components/UI/CustomDatePicker';
import PasswordStrengthMeter from '../../components/UI/PasswordStrengthMeter';
import { FeatureFlags } from '../../constants/featureFlags';

const maxDate = new Date();
maxDate.setFullYear(maxDate.getFullYear() - 18);

const passwordRequirements = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, 'Password must contain uppercase, lowercase, number and special character');

const signupSchema = z.object({
    firstName: z.string().min(1, "First Name is required").regex(/^[a-zA-Z]+$/, "First Name must contain only alphabets"),
    lastName: z.string().optional().refine(val => !val || /^[a-zA-Z]+$/.test(val), "Last name must contain only alphabets"),
    dob: z.date({
        message: "Date of Birth is required"
    }),
    password: passwordRequirements,
    confirmPassword: z.string().min(1, "Confirm Password is required"),
    referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const resetSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dob: z.date().optional(),
    password: passwordRequirements,
    confirmPassword: z.string().min(1, "Confirm Password is required"),
    referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type SignupData = z.infer<typeof signupSchema>;
type ResetData = z.infer<typeof resetSchema>;
type FormData = SignupData | ResetData;

export default function CreatePassword() {
    const { t } = useTranslation();
    const router = useRouter();
    const { flow } = useLocalSearchParams(); // 'signup' or 'reset'
    const isSignup = String(flow) === 'signup';

    const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(isSignup ? signupSchema : resetSchema),
        mode: 'onBlur',
        defaultValues: {
            firstName: '',
            lastName: '',
            dob: undefined,
            password: '',
            confirmPassword: '',
            referralCode: '',
        }
    });

    const password = watch('password');
    const confirmPassword = watch('confirmPassword');
    const isMatch = password && confirmPassword && password === confirmPassword;

    const [showSurvey, setShowSurvey] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const onSubmit = (data: FormData) => {
        if (isSignup) {
            setShowSurvey(true);
        } else {
            setShowSuccessModal(true);
        }
    };

    const handleSurveyComplete = (source: string) => {
        console.log('Survey Source:', source);
        // TODO: Submit full signup data + source to backend
        setShowSurvey(false);
        router.push('/home');
    };

    return (
        <ScreenWrapper scrollable contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 20 }}>
            {/* Header */}
            <View className="mb-8 mt-4 items-center">
                <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
                    {isSignup ? t('welcome') : t('resetPassHeader')}
                </Text>
            </View>

            <View className="gap-4">
                {isSignup && (
                    <>
                        <View>
                            <Text className="text-gray-500 font-medium mb-3">Basic Details</Text>
                            <Controller
                                control={control}
                                name="firstName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <StandardInput
                                        label="First Name"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        error={errors.firstName?.message}
                                        containerStyle={{ marginBottom: 16 }}
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="lastName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <StandardInput
                                        label="Last Name"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        error={errors.lastName?.message}
                                        containerStyle={{ marginBottom: 16 }}
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="dob"
                                render={({ field: { onChange, value } }) => (
                                    <CustomDatePicker
                                        label="Date of Birth"
                                        value={value || null}
                                        onChange={onChange}
                                        maximumDate={maxDate}
                                        placeholder="Select Date of Birth"
                                    />
                                )}
                            />
                            {errors.dob && <Text className="text-red-500 text-xs ml-1 mt-1">{errors.dob.message}</Text>}
                        </View>
                    </>
                )}

                <View>
                    <Text className="text-gray-500 font-medium mb-3">Set your Password</Text>
                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <StandardInput
                                label={t('enterPass')}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                secureTextEntry={!isPasswordVisible}
                                error={errors.password?.message}
                                rightComponent={
                                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                                        <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                }
                            />
                        )}
                    />

                    <PasswordStrengthMeter password={password} />

                    <View className="mt-4">
                        <Controller
                            control={control}
                            name="confirmPassword"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <StandardInput
                                    label={t('confirmPassword')}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={errors.confirmPassword?.message}
                                    secureTextEntry={!isConfirmPasswordVisible}
                                    rightComponent={
                                        <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
                                            <Ionicons name={isConfirmPasswordVisible ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    }
                                />
                            )}
                        />

// Match Indicator Logic
                        {(confirmPassword.length > 0 || (password.length > 0 && errors.confirmPassword)) && (
                            <View className="flex-row items-center justify-end mt-2 px-1">
                                <Text className="text-xs text-gray-500 mr-2">
                                    Both passwords <Text className="font-bold text-gray-900">{isMatch ? 'match' : 'do not match'}</Text>
                                </Text>
                                {isMatch ? (
                                    <View className="bg-emerald-100 rounded-full p-0.5">
                                        <Ionicons name="checkmark" size={12} color="#10B981" />
                                    </View>
                                ) : (
                                    <View className="bg-red-100 rounded-full p-0.5">
                                        <Ionicons name="close" size={12} color="#EF4444" />
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {isSignup && FeatureFlags.ENABLE_REFERRAL_CODE && (
                    <View>
                        <Text className="text-gray-500 font-medium mb-3 mt-4">Referral Code (optional)</Text>
                        <Controller
                            control={control}
                            name="referralCode"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <StandardInput
                                    label="Referral Code"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                />
                            )}
                        />
                    </View>
                )}

                <CustomButton onPress={handleSubmit(onSubmit)} className="mt-8 mb-10">
                    {isSignup ? 'Sign Up' : t('submit')}
                </CustomButton>
            </View>

            <SourceSurveyModal
                visible={showSurvey}
                onClose={() => handleSurveyComplete('Skipped')} // Should not happen with current UI but safe fallback
                onComplete={handleSurveyComplete}
            />

            <CustomConfirmationModal
                visible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                onConfirm={() => {
                    setShowSuccessModal(false);
                    router.push('/login');
                }}
                title="Success!"
                message="Your password has been reset successfully. You can now log in with your new password."
                confirmLabel="Log In"
                variant="success"
            />

        </ScreenWrapper>
    );
}
