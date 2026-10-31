import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { palette } from '@tweak/theme';

interface QuickAction {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    bg: string;
    route: string;
}

export default function ProfileQuickActions(): React.JSX.Element {
    const router = useRouter();

    const actions: QuickAction[] = [
        { icon: 'trending-up', label: 'Score', color: palette.purple500, bg: palette.violet100, route: '/score' },
        { icon: 'wallet', label: 'Wallet', color: palette.green600, bg: palette.emerald100, route: '/wallet' },
        { icon: 'receipt', label: 'Refunds', color: palette.blue500, bg: palette.blue100, route: '/refunds' },
        { icon: 'location', label: 'Address', color: palette.orange500, bg: palette.orange200, route: '/profile/edit' },
    ];

    return (
        <View className="px-6 py-4">
            <View className="flex-row flex-wrap gap-3">
                {actions.map((action, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => router.push(action.route as Href)}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 items-center justify-center"
                        style={{ width: '47%' }}
                    >
                        <View
                            className="w-12 h-12 rounded-full items-center justify-center mb-2"
                            style={{ backgroundColor: action.bg }}
                        >
                            <Ionicons name={action.icon} size={24} color={action.color} />
                        </View>
                        <Text className="font-semibold text-gray-900">{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}
