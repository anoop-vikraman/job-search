import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { palette } from '@tweak/theme';

interface MenuItem {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    route: string;
}

export default function ProfileMenuList() {
    const router = useRouter();

    const supportItems: MenuItem[] = [
        { icon: 'people', label: 'Invite a Friend', route: '/invite' },
        { icon: 'help-circle', label: 'Help Center', route: '/help' },
        { icon: 'language', label: 'Language', route: '/settings/language' },
    ];

    const legalItems: MenuItem[] = [
        { icon: 'document-text', label: 'Terms & Conditions', route: '/settings/terms' },
        { icon: 'shield-checkmark', label: 'Privacy Policy', route: '/settings/privacy' },
    ];

    const renderItem = (item: MenuItem) => (
        <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route as Href)}
            className="flex-row items-center justify-between py-4 border-b border-gray-100"
        >
            <View className="flex-row items-center">
                <Ionicons name={item.icon} size={20} color={palette.gray500} />
                <Text className="ml-3 text-gray-700 font-medium">{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.gray400} />
        </TouchableOpacity>
    );

    return (
        <View className="px-6 py-4">
            {/* Support Section */}
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                <Text className="text-gray-500 font-semibold text-xs uppercase mb-2">Support</Text>
                {supportItems.map(renderItem)}
            </View>

            {/* Legal Section */}
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <Text className="text-gray-500 font-semibold text-xs uppercase mb-2">Legal</Text>
                {legalItems.map(renderItem)}
            </View>
        </View>
    );
}
