import { StandardInput } from '@/components/UI/StandardInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { authApi } from '../../api/auth';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CountryCodePicker from '../../components/UI/CountryCodePicker';
import CustomButton from '../../components/UI/CustomButton';
import { Toast } from '../../components/UI/ToastManager';
import { FeatureFlags } from '../../constants/featureFlags';

const schema = z.object({
    mobile: z.string().length(10, { message: 'Mobile number must be 10 digits' }).regex(/^\d+$/, { message: 'Mobile number must contain only digits' }),
});

type FormData = z.infer<typeof schema>;

export default function CheckMobile(): React.JSX.Element {
    const { t } = useTranslation();
    const router = useRouter();
    const { flow } = useLocalSearchParams();

    const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            mobile: '',
        }
    });

    const [countryCode, setCountryCode] = React.useState('+91');

    // Inside component
    const [isLoading, setIsLoading] = React.useState(false);

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            await authApi.generateOtp({
                country_code: countryCode,
                phone_number: data.mobile,
                request_type: flow === 'reset' ? 'FORGOT_PASSWORD' : 'SIGNUP'
            });

            router.push({
                pathname: '/auth/otp',
                params: { mobile: data.mobile, countryCode, flow }
            });
        } catch (error) {
            Toast.error("Failed to generate OTP. Please check your mobile number.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper scrollable contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
            <View className="mb-10 items-center">
                <Text className="text-3xl font-bold text-text mb-2 text-center">
                    {flow === 'reset' ? t('forgotPassHeader') : t('signupHeader')}
                </Text>
                <Text className="text-base text-textSecondary text-center">
                    {flow === 'reset' ? t('forgotPassSubheader') : t('signupSubheader')}
                </Text>
            </View>

            <View className="gap-6">
                <Controller
                    control={control}
                    name="mobile"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <StandardInput
                            label={t('enterMobile')}
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            keyboardType="phone-pad"
                            maxLength={10}
                            error={errors.mobile?.message}
                            leftComponent={
                                <View className="border-r border-gray-200 dark:border-slate-700 pr-2 mr-[-4px]">
                                    <CountryCodePicker
                                        selectedCode={countryCode}
                                        onSelect={setCountryCode}
                                        disabled={!FeatureFlags.ENABLE_COUNTRY_PICKER}
                                    />
                                </View>
                            }
                        />
                    )}
                />

                <CustomButton onPress={handleSubmit(onSubmit)} loading={isLoading}>
                    {t('sendOtp')}
                </CustomButton>
            </View>
        </ScreenWrapper>
    );
}
