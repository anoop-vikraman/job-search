import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Text, View } from 'react-native';

import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '@/themes/ThemeProvider';

interface OfferItem {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    surfaceClassName: string;
    iconSurfaceClassName: string;
}

export default function OffersPage(): React.JSX.Element {
    const { colors } = useTheme();
    // Populated from GET /api/v1/offers once the backend exists.
    const offers: OfferItem[] = [];

    return (
        <ScreenWrapper>
            <View className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <Text className="text-xl font-bold text-gray-900 dark:text-slate-50">Offers & Rewards</Text>
            </View>

            <FlatList
                data={offers}
                keyExtractor={(item) => item.id}
                className="flex-1 px-4 py-4"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View className="items-center py-24">
                        <View className="bg-gray-100 dark:bg-slate-800 w-20 h-20 rounded-full items-center justify-center mb-4">
                            <Ionicons name="gift-outline" size={32} color={colors.textMuted} />
                        </View>
                        <Text className="text-gray-400 dark:text-slate-400 font-medium">No offers available right now</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View
                        className={`rounded-2xl p-4 mb-4 border flex-row items-center ${item.surfaceClassName}`}
                    >
                        <View
                            className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${item.iconSurfaceClassName}`}
                        >
                            <Ionicons name={item.icon} size={24} color={item.iconColor} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 dark:text-slate-50 text-lg">{item.title}</Text>
                            <Text className="text-gray-600 dark:text-slate-300 text-sm">{item.subtitle}</Text>
                        </View>
                    </View>
                )}
            />
        </ScreenWrapper>
    );
}
