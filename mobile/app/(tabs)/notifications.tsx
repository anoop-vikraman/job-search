import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useMarkAllRead, useMarkRead, useNotifications } from '../../hooks/useNotifications';
import { palette } from '@tweak/theme';
import { useTheme } from '@/themes/ThemeProvider';

export default function NotificationsPage(): React.JSX.Element {
    const { colors } = useTheme();
    const { data: notifications = [] } = useNotifications();
    const markAllRead = useMarkAllRead();
    const markRead = useMarkRead();

    return (
        <ScreenWrapper>
            <View className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 flex-row justify-between items-center">
                <Text className="text-xl font-bold text-gray-900 dark:text-slate-50">Notifications</Text>
                <TouchableOpacity
                    onPress={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Mark all as read"
                >
                    <Ionicons
                        name="checkmark-done-circle-outline"
                        size={24}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                className="flex-1 px-4 py-4"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View className="items-center py-24">
                        <View className="bg-gray-100 dark:bg-slate-800 w-20 h-20 rounded-full items-center justify-center mb-4">
                            <Ionicons name="notifications-off-outline" size={32} color={colors.textMuted} />
                        </View>
                        <Text className="text-gray-400 dark:text-slate-400 font-medium">No notifications yet</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                            if (!item.is_read) markRead.mutate(item.id);
                        }}
                        className="flex-row items-start bg-white dark:bg-slate-900 p-4 rounded-xl mb-3 border border-gray-100 dark:border-slate-700 shadow-sm"
                        style={{ opacity: item.is_read ? 0.6 : 1 }}
                    >
                        <View
                            className="w-10 h-10 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: `${palette.blue500}20` }}
                        >
                            <Ionicons name="notifications-outline" size={20} color={palette.blue500} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 dark:text-slate-50 mb-1">{item.title}</Text>
                            <Text className="text-gray-600 dark:text-slate-300 text-sm mb-1">{item.body}</Text>
                            <Text className="text-gray-400 dark:text-slate-400 text-xs">
                                {new Date(item.created_at).toLocaleString()}
                            </Text>
                        </View>
                        {!item.is_read && (
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.blue500, marginTop: 4 }} />
                        )}
                    </TouchableOpacity>
                )}
            />
        </ScreenWrapper>
    );
}
