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
import { useTweaksStore } from '../store/useTweaksStore';
import { useConfirmationStore } from '../store/useConfirmationStore';

export default function Login() {
    const { t } = useTranslation();
    const router = useRouter();
    const { login, clearUsers } = useAuthStore();
    const { clearTweaks } = useTweaksStore();
    const confirm = useConfirmationStore(state => state.confirm);

    const [mobile, setMobile] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [countryCode, setCountryCode] = React.useState('+91');
    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleClearData = () => {
        confirm({
            title: 'Clear All Data?',
            message: 'This will delete all registered users and created tweaks. This action cannot be undone.',
            variant: 'danger',
            confirmLabel: 'Clear All',
            onConfirm: () => {
                clearUsers();
                clearTweaks();
                Toast.success("All data cleared successfully");
            }
        });
    };

    const onSubmit = async () => {
        if (!mobile || !password) {
            Toast.error("Mobile number and password are required");
            return;
        }

        setIsLoading(true);
        try {
            const success = await login(mobile, countryCode, password);
            if (success) {
                router.replace('/(tabs)');
            } else {
                Toast.error("Invalid mobile number or password");
            }
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
                        <View className="border-r border-gray-200 pr-2 mr-[-4px]">
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
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                            <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={20} color="#6B7281" />
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

                <TouchableOpacity 
                    onPress={handleClearData}
                    className="mt-10 items-center"
                >
                    <View className="flex-row items-center gap-1 opacity-40">
                        <Ionicons name="trash-outline" size={14} color="#6B7281" />
                        <Text className="text-xs text-textSecondary font-medium">Clear All App Data (Dev)</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}
