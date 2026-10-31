import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { palette } from '@tweak/theme';

const PROMO_ITEMS: { title: string; sub: string; color: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }[] = [
    { title: 'Premium', sub: 'Get more visibility', color: 'bg-purple-100', icon: 'star', iconColor: palette.purple500 },
    { title: 'Streak', sub: '3 Day Streak!', color: 'bg-red-100', icon: 'flame', iconColor: palette.red500 },
    { title: 'Referral', sub: 'Invite friends', color: 'bg-green-100', icon: 'people', iconColor: palette.green600 },
];

export default function SecondaryPromo(): React.JSX.Element {
    return (
        <View className="mb-8">
            <View className="px-6 mb-3 flex-row justify-between items-end">
                <Text className="text-gray-900 dark:text-slate-50 font-bold text-lg">Featured For You</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
            >
                {PROMO_ITEMS.map((item, index) => (
                    <View key={index} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 w-[140px]">
                        <View className={`w-10 h-10 rounded-full items-center justify-center mb-3 ${item.color}`}>
                            <Ionicons name={item.icon} size={20} color={item.iconColor} />
                        </View>
                        <Text className="font-bold text-gray-900 dark:text-slate-50 mb-1">{item.title}</Text>
                        <Text className="text-xs text-gray-500 dark:text-slate-400">{item.sub}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
