import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface QuickAction {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    bg: string;
    route: string;
}

export default function ProfileQuickActions() {
    const router = useRouter();

    const actions: QuickAction[] = [
        { icon: 'trending-up', label: 'Score', color: '#8B5CF6', bg: '#EDE9FE', route: '/score' },
        { icon: 'wallet', label: 'Wallet', color: '#10B981', bg: '#D1FAE5', route: '/wallet' },
        { icon: 'receipt', label: 'Refunds', color: '#3B82F6', bg: '#DBEAFE', route: '/refunds' },
        { icon: 'location', label: 'Address', color: '#F97316', bg: '#FED7AA', route: '/profile/edit' },
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
