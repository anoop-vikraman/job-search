import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

import ChatAvatar from '@/components/Chat/ChatAvatar';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { participantName } from '@/hooks/useChat';
import { useBlockedUsers, useSetBlocked } from '@/hooks/useModeration';
import { useTheme } from '@/themes/ThemeProvider';

export default function BlockedUsersPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { data: blocked = [], isLoading } = useBlockedUsers();
    const setBlocked = useSetBlocked();

    return (
        <ScreenWrapper>
            <View className="flex-row items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">Blocked Users</Text>
            </View>
            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={colors.textMuted} />
            ) : (
                <FlatList
                    data={blocked}
                    keyExtractor={(b) => b.user.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 120, flexGrow: 1 }}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 60 }}>
                            You haven't blocked anyone.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
                            <ChatAvatar user={item.user} size={40} />
                            <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.text }}>{participantName(item.user)}</Text>
                            <TouchableOpacity
                                onPress={() => setBlocked.mutate({ userId: item.user.id, blocked: false })}
                                disabled={setBlocked.isPending}
                                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                                accessibilityRole="button"
                                accessibilityLabel={`Unblock ${participantName(item.user)}`}
                            >
                                <Text style={{ fontWeight: '700', color: colors.textSecondary }}>Unblock</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </ScreenWrapper>
    );
}
