import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { palette } from '@tweak/theme';

import ChatAvatar from '@/components/Chat/ChatAvatar';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { participantName, useConversations } from '@/hooks/useChat';
import { useTheme } from '@/themes/ThemeProvider';
import type { Conversation } from '@/types/api';

function formatWhen(iso: string): string {
    const d = dayjs(iso);
    return d.isSame(dayjs(), 'day') ? d.format('HH:mm') : d.format('DD MMM');
}

export default function ConversationsPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const isFocused = useIsFocused();
    const { data: conversations = [], isLoading, isRefetching, refetch } = useConversations({ poll: isFocused });

    const renderItem = ({ item }: { item: Conversation }): React.JSX.Element => {
        const unread = item.unread_count > 0;
        const preview = item.last_message
            ? `${item.last_message.sender_user_id === item.other_user.id ? '' : 'You: '}${item.last_message.body}`
            : 'Say hello 👋';
        return (
            <TouchableOpacity
                onPress={() => router.push(`/chat/${item.id}` as Href)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                accessibilityRole="button"
                accessibilityLabel={`Conversation with ${participantName(item.other_user)}${unread ? `, ${item.unread_count} unread` : ''}`}
            >
                <ChatAvatar user={item.other_user} />
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: unread ? '800' : '700', color: colors.text }}>
                            {participantName(item.other_user)}
                        </Text>
                        {item.last_message_at && (
                            <Text style={{ fontSize: 11, color: unread ? palette.iosBlue : colors.textMuted, fontWeight: unread ? '700' : '500', marginLeft: 8 }}>
                                {formatWhen(item.last_message_at)}
                            </Text>
                        )}
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                        {item.tweak_title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, color: unread ? colors.text : colors.textSecondary, fontWeight: unread ? '600' : '400' }}>
                            {preview}
                        </Text>
                        {unread && (
                            <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: palette.iosBlue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 }}>
                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                                    {item.unread_count > 99 ? '99+' : item.unread_count}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 8 }} accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Messages</Text>
            </View>
            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshing={isRefetching}
                onRefresh={refetch}
                contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
                ListEmptyComponent={
                    isLoading ? undefined : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 80 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textSecondary }}>No conversations yet</Text>
                            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                                Chat opens once an application is accepted. Start one from the tweak or applicant screen.
                            </Text>
                        </View>
                    )
                }
            />
        </ScreenWrapper>
    );
}
