import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Text, View } from 'react-native';

import { ScreenWrapper } from '../../components/ScreenWrapper';

interface NotificationItem {
    id: string;
    title: string;
    description: string;
    time: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}

export default function NotificationsPage(): React.JSX.Element {
    // Populated from GET /api/v1/notifications once the backend exists.
    const notifications: NotificationItem[] = [];

    return (
        <ScreenWrapper>
            <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row justify-between items-center">
                <Text className="text-xl font-bold text-gray-900">Notifications</Text>
                <Ionicons
                    name="checkmark-done-circle-outline"
                    size={24}
                    color="#6B7280"
                    accessibilityLabel="Mark all as read"
                />
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                className="flex-1 px-4 py-4"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View className="items-center py-24">
                        <View className="bg-gray-100 w-20 h-20 rounded-full items-center justify-center mb-4">
                            <Ionicons name="notifications-off-outline" size={32} color="#9CA3AF" />
                        </View>
                        <Text className="text-gray-400 font-medium">No notifications yet</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View className="flex-row items-start bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm">
                        <View
                            className="w-10 h-10 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: `${item.color}20` }}
                        >
                            <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 mb-1">{item.title}</Text>
                            <Text className="text-gray-600 text-sm mb-1">{item.description}</Text>
                            <Text className="text-gray-400 text-xs">{item.time}</Text>
                        </View>
                    </View>
                )}
            />
        </ScreenWrapper>
    );
}
