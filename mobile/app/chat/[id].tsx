import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
import type { ChatMessage, ReportTarget } from '@/types/api';
import { useSetBlocked } from '@/hooks/useModeration';
import ReportSheet from '@/components/Moderation/ReportSheet';
import PhotoStrip from '@/components/Work/PhotoStrip';
import { Toast } from '@/components/UI/ToastManager';
import { mediaUri, pickAndUploadPhotos } from '@/utils/mediaUpload';

const MAX_LENGTH = 2000;
const MAX_PHOTOS = 4;

function formatStamp(iso: string): string {
    const d = dayjs(iso);
    return d.isSame(dayjs(), 'day') ? d.format('HH:mm') : d.format('DD MMM, HH:mm');
}

export default function ChatThreadPage(): React.JSX.Element {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const isFocused = useIsFocused();

    const { data: conversation, refetch: refetchConversation } = useConversation(id);
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ type: ReportTarget; id: string } | null>(null);
    const setBlocked = useSetBlocked();
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
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const hasContent = trimmed.length > 0 || photos.length > 0;

    // "Seen" goes under my newest message once the other side's read cursor passes it.
    const myLatest = otherId ? messages.find((m) => m.sender_user_id !== otherId) : undefined;
    const seenId =
        myLatest && conversation?.other_last_read_at && conversation.other_last_read_at >= myLatest.created_at
            ? myLatest.id
            : undefined;

    const attach = async (): Promise<void> => {
        setUploading(true);
        try {
            const urls = await pickAndUploadPhotos(MAX_PHOTOS - photos.length);
            setPhotos((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
        } catch {
            Toast.error('Could not upload the photo. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSend = (): void => {
        if (!hasContent || !canSend || send.isPending || uploading) return;
        const body = trimmed;
        const attachmentUrls = photos;
        setDraft('');
        setPhotos([]);
        send.mutate(
            { body, attachmentUrls },
            {
                onError: () => {
                    setDraft(body);
                    setPhotos(attachmentUrls);
                },
            }
        );
    };

    const renderMessage = ({ item }: { item: ChatMessage }): React.JSX.Element => {
        const mine = item.sender_user_id !== otherId;
        return (
            <Pressable
                onLongPress={mine ? undefined : () => setReportTarget({ type: 'message', id: item.id })}
                delayLongPress={400}
                style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 3, paddingHorizontal: 12 }}
            >
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
                    {item.attachments.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: item.body ? 6 : 0 }}>
                            {item.attachments.map((a) => (
                                <Image
                                    key={a.url}
                                    source={{ uri: mediaUri(a.url) }}
                                    style={{ width: item.attachments.length === 1 ? 200 : 96, height: item.attachments.length === 1 ? 200 : 96, borderRadius: 10 }}
                                    accessibilityLabel="Photo"
                                />
                            ))}
                        </View>
                    )}
                    {item.body ? (
                        <Text style={{ fontSize: 15, lineHeight: 20, color: mine ? '#fff' : colors.text }}>{item.body}</Text>
                    ) : null}
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, marginHorizontal: 4 }}>
                    {formatStamp(item.created_at)}
                    {item.id === seenId ? ' · Seen' : ''}
                </Text>
            </Pressable>
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
                {conversation && (
                    <TouchableOpacity onPress={() => setMenuOpen(true)} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="More options">
                        <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
                    </TouchableOpacity>
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
                        {conversation.blocked
                            ? "You can't message this user."
                            : conversation.pre_accept_remaining === 0
                              ? "You've used your messages for now. Chat fully opens once the application is accepted."
                              : 'This job was cancelled, so the conversation is read-only.'}
                    </Text>
                </View>
            ) : (
                <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
                {conversation?.pre_accept_remaining != null && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingTop: 8, paddingHorizontal: 16 }}>
                        Application not accepted yet: you can send {conversation.pre_accept_remaining} more message
                        {conversation.pre_accept_remaining === 1 ? '' : 's'}.
                    </Text>
                )}
                {photos.length > 0 && (
                    <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
                        <PhotoStrip urls={photos} size={56} onRemove={(url) => setPhotos((prev) => prev.filter((p) => p !== url))} />
                    </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <TouchableOpacity
                        onPress={attach}
                        disabled={uploading || photos.length >= MAX_PHOTOS || !conversation}
                        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                        accessibilityRole="button"
                        accessibilityLabel="Attach photo"
                    >
                        {uploading ? <ActivityIndicator size="small" color={colors.textMuted} /> : <Ionicons name="image-outline" size={24} color={colors.textSecondary} />}
                    </TouchableOpacity>
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
                        disabled={!hasContent || send.isPending || uploading}
                        style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: hasContent ? palette.iosBlue : colors.surfaceMuted }}
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                    >
                        {send.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={18} color={hasContent ? '#fff' : colors.textMuted} />
                        )}
                    </TouchableOpacity>
                </View>
                </View>
            )}
            {/* Options */}
            <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setMenuOpen(false)}>
                    <View style={{ position: 'absolute', top: 64, right: 12, backgroundColor: colors.surface, borderRadius: 14, minWidth: 200, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12 }}>
                        {conversation && (
                            <>
                                <TouchableOpacity
                                    onPress={() => {
                                        setMenuOpen(false);
                                        setReportTarget({ type: 'user', id: conversation.other_user.id });
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
                                >
                                    <Ionicons name="flag-outline" size={18} color="#DC2626" />
                                    <Text style={{ fontWeight: '600', color: '#DC2626' }}>Report {participantName(conversation.other_user)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setMenuOpen(false);
                                        const name = participantName(conversation.other_user);
                                        const blocking = !conversation.blocked;
                                        Alert.alert(
                                            blocking ? `Block ${name}?` : `Unblock ${name}?`,
                                            blocking
                                                ? "You won't see each other's tweaks, apply to them, or message each other."
                                                : 'You will be able to interact again.',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: blocking ? 'Block' : 'Unblock',
                                                    style: blocking ? 'destructive' : 'default',
                                                    onPress: () =>
                                                        setBlocked.mutate(
                                                            { userId: conversation.other_user.id, blocked: blocking },
                                                            { onSuccess: () => void refetchConversation() }
                                                        ),
                                                },
                                            ]
                                        );
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}
                                >
                                    <Ionicons name="ban-outline" size={18} color={colors.textSecondary} />
                                    <Text style={{ fontWeight: '600', color: colors.textSecondary }}>
                                        {conversation.blocked ? 'Unblock' : 'Block'} {participantName(conversation.other_user)}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </Pressable>
            </Modal>
            <ReportSheet
                visible={reportTarget !== null}
                target={reportTarget}
                subject={reportTarget?.type === 'message' ? 'this message' : conversation ? participantName(conversation.other_user) : 'user'}
                onClose={() => setReportTarget(null)}
            />
        </ScreenWrapper>
    );
}
