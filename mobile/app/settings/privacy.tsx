import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '@/themes/ThemeProvider';

export default function PrivacyPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <View className="flex-row items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">Privacy Policy</Text>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
                <Text className="text-gray-700 dark:text-slate-300 text-base leading-6">
                    {/* Placeholder content */}
                    Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information.
                    {'\n\n'}
                    We collect information that you provide directly to us, including your name, email address, phone number, and other contact details.
                    {'\n\n'}
                    We use this information to provide and improve our services, communicate with you, and ensure the security of our platform.
                    {'\n\n'}
                    We do not sell, trade, or rent your personal information to third parties without your consent.
                </Text>
            </ScrollView>
        </ScreenWrapper>
    );
}
