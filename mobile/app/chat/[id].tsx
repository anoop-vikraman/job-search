import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { palette } from '@tweak/theme';

import ChatAvatar from '@/components/Chat/ChatAvatar';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import {
    participantName,
    useConversation,
    useMarkConversationRead,
    useMessages,
    useSendMessage,
} from '@/hooks/useChat';
import { useTheme } from '@/themes/ThemeProvider';
import type { ChatMessage } from '@/types/api';

const MAX_LENGTH = 2000;

function formatStamp(iso: string): string {
    const d = dayjs(iso);
    return d.isSame(dayjs(), 'day') ? d.format('HH:mm') : d.format('DD MMM, HH:mm');
}

export default function ChatThreadPage(): React.JSX.Element {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const isFocused = useIsFocused();

    const { data: conversation } = useConversation(id);
    const { data: messages = [], isLoading } = useMessages(id, { poll: isFocused });
    const send = useSendMessage(id);
    const { mutate: markRead } = useMarkConversationRead();
    const [draft, setDraft] = useState('');

    const otherId = conversation?.other_user.id;
    // Newest message from the other party; when it changes while visible, mark read.
    const latestIncomingId = otherId
        ? messages.find((m) => m.sender_user_id === otherId)?.id
        : undefined;

    useEffect(() => {
        if (isFocused && id && latestIncomingId) markRead(id);
    }, [isFocused, id, latestIncomingId, markRead]);

    const canSend = conversation?.can_send ?? false;
    const trimmed = draft.trim();

    const handleSend = (): void => {
        if (!trimmed || !canSend || send.isPending) return;
        setDraft('');
        send.mutate(trimmed, { onError: () => setDraft(trimmed) });
    };

    const renderMessage = ({ item }: { item: ChatMessage }): React.JSX.Element => {
        const mine = item.sender_user_id !== otherId;
        return (
            <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 3, paddingHorizontal: 12 }}>
                <View
                    style={{
                        maxWidth: '80%',
                        backgroundColor: mine ? palette.iosBlue : isDark ? colors.surfaceMuted : palette.slate100,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 16,
                        borderBottomRightRadius: mine ? 4 : 16,
                        borderBottomLeftRadius: mine ? 16 : 4,
                    }}
                >
                    <Text style={{ fontSize: 15, lineHeight: 20, color: mine ? '#fff' : colors.text }}>{item.body}</Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, marginHorizontal: 4 }}>
                    {formatStamp(item.created_at)}
                </Text>
            </View>
        );
    };

    return (
        <ScreenWrapper>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                {conversation ? (
                    <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                        onPress={() => router.push(`/tweaks/${conversation.tweak_id}` as Href)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open tweak ${conversation.tweak_title}`}
                    >
                        <ChatAvatar user={conversation.other_user} size={36} />
                        <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                                {participantName(conversation.other_user)}
                            </Text>
                            <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>
                                {conversation.my_role === 'lister' ? 'Provider' : 'Lister'} · {conversation.tweak_title}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={{ flex: 1 }} />
                )}
            </View>

            {/* Messages */}
            {isLoading || !conversation ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={colors.textMuted} />
                </View>
            ) : (
                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    inverted={messages.length > 0}
                    contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
                            <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.textMuted} />
                            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                                Coordinate timing, address details or anything else about this tweak.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Composer */}
            {conversation && !canSend ? (
                <View style={{ padding: 14, backgroundColor: colors.surfaceMuted, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ textAlign: 'center', fontSize: 13, color: colors.textSecondary }}>
                        This job was cancelled, so the conversation is read-only.
                    </Text>
                </View>
            ) : (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        placeholder="Message"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        maxLength={MAX_LENGTH}
                        editable={Boolean(conversation)}
                        style={{ flex: 1, maxHeight: 120, minHeight: 40, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 20, backgroundColor: colors.surfaceMuted, color: colors.text, fontSize: 15 }}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!trimmed || send.isPending}
                        style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: trimmed ? palette.iosBlue : colors.surfaceMuted }}
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                    >
                        {send.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={18} color={trimmed ? '#fff' : colors.textMuted} />
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </ScreenWrapper>
    );
}
