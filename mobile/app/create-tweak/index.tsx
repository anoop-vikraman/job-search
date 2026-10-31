import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useCreateTweakStore } from '../../store/useCreateTweakStore';
import { palette } from '@tweak/theme';
import { useTheme } from '@/themes/ThemeProvider';

export default function CreateTweakIndex(): React.JSX.Element {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const setTweakType = useCreateTweakStore((state) => state.setTweakType);
    const reset = useCreateTweakStore((state) => state.reset);

    // Reset flow when starting fresh
    React.useEffect(() => {
        reset();
    }, []);

    const handleSelect = (type: 'remote' | 'in_person') => {
        setTweakType(type);
        if (type === 'in_person') {
            router.push('/create-tweak/location-entry');
        } else {
            router.push('/create-tweak/category');
        }
    };

    return (
        <ScreenWrapper>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-gray-100" accessibilityRole="button" accessibilityLabel="Close">
                    <Ionicons name="close" size={24} color={isDark ? colors.text : palette.gray900} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">Step 1 of 8</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-purple-600 font-bold">Save</Text>
                </TouchableOpacity>
            </View>

            <View className="px-6 py-8 flex-1">
                <Text className="text-3xl font-bold text-gray-900 dark:text-slate-50 mb-2">How should this tweak be done?</Text>
                <Text className="text-gray-500 dark:text-slate-400 mb-8">Choose if the work requires physical presence or can be done online.</Text>

                <View className="gap-4">
                    {/* Onsite / In-Person */}
                    <TouchableOpacity
                        className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm active:border-purple-500 active:bg-purple-50"
                        onPress={() => handleSelect('in_person')}
                    >
                        <View className="bg-orange-100 w-12 h-12 rounded-full items-center justify-center mb-4">
                            <Ionicons name="location" size={24} color={palette.orange500} />
                        </View>
                        <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 mb-2">On-site</Text>
                        <Text className="text-gray-500 dark:text-slate-400">
                            Select this if the person needs to come to a specific location (e.g., cleaning, repairs).
                        </Text>
                    </TouchableOpacity>

                    {/* Remote */}
                    <TouchableOpacity
                        className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm active:border-purple-500 active:bg-purple-50"
                        onPress={() => handleSelect('remote')}
                    >
                        <View className="bg-blue-100 w-12 h-12 rounded-full items-center justify-center mb-4">
                            <Ionicons name="laptop-outline" size={24} color={palette.blue500} />
                        </View>
                        <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 mb-2">Remote</Text>
                        <Text className="text-gray-500 dark:text-slate-400">
                            Select this for digital tasks that can be done from anywhere (e.g., design, coding).
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
}
