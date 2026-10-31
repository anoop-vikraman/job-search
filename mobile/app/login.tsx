import { StandardInput } from '@/components/UI/StandardInput';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import CountryCodePicker from '../components/UI/CountryCodePicker';
import CustomButton from '../components/UI/CustomButton';
import { Toast } from '../components/UI/ToastManager';
import { useAuthStore } from '../store/useAuthStore';
import { palette } from '@tweak/theme';
import { useTheme } from '@/themes/ThemeProvider';

export default function Login(): React.JSX.Element {
    const { t } = useTranslation();
    const router = useRouter();
    const { login } = useAuthStore();
    const { colors, isDark } = useTheme();

    const [mobile, setMobile] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [countryCode, setCountryCode] = React.useState('+91');
    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);

    const onSubmit = async () => {
        if (!mobile || !password) {
            Toast.error("Mobile number and password are required");
            return;
        }

        setIsLoading(true);
        try {
            await login({ country_code: countryCode, phone_number: mobile, password });
            router.replace('/(tabs)');
        } catch (error) {
            Toast.error("Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper scrollable contentContainerStyle={{ paddingHorizontal: 24, justifyContent: 'center', flexGrow: 1 }}>
            <View className="mb-10 items-center">
                <Text className="text-3xl font-bold text-text mb-2 text-center">
                    {t('loginHeader')}
                </Text>
                <Text className="text-base text-textSecondary text-center">
                    {t('loginSubheader')}
                </Text>
            </View>

            <View className="gap-4">
                <StandardInput
                    label={t('mobileNumber')}
                    onChangeText={setMobile}
                    value={mobile}
                    keyboardType="phone-pad"
                    maxLength={10}
                    leftComponent={
                        <View className="border-r border-gray-200 dark:border-slate-700 pr-2 mr-[-4px]">
                            <CountryCodePicker
                                selectedCode={countryCode}
                                onSelect={setCountryCode}
                            />
                        </View>
                    }
                />

                <StandardInput
                    label={t('password')}
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry={!isPasswordVisible}
                    rightComponent={
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} accessibilityRole="button" accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}>
                            <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={20} color={isDark ? colors.textSecondary : palette.gray500} />
                        </TouchableOpacity>
                    }
                />

                <CustomButton onPress={onSubmit} loading={isLoading} className="mt-4">
                    {t('login')}
                </CustomButton>

                <View className="flex-row justify-center items-center mt-6">
                    <Text className="text-textSecondary mr-2">{t('noAccount')}</Text>
                    <TouchableOpacity onPress={() => router.push('/signup')}>
                        <Text className="text-primary font-bold">{t('signup')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
}
