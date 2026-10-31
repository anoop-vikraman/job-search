import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';

import { chatApi } from '../api/chat';
import type { ChatMessage, Conversation } from '../types/api';
import { queryKeys } from './queryKeys';

// Polling intervals (no websocket yet). Only active while the screen is focused.
const THREAD_POLL_MS = 4000;
const LIST_POLL_MS = 15000;
const BADGE_POLL_MS = 30000;

export interface PollOptions {
    /** Poll while true (pass the screen's focus state). */
    poll?: boolean;
}

/** The caller's conversations, most recently active first. */
export function useConversations({ poll = false }: PollOptions = {}): UseQueryResult<Conversation[]> {
    return useQuery({
        queryKey: queryKeys.conversations(),
        queryFn: async (): Promise<Conversation[]> => {
            const page = await chatApi.list({ page: 1, limit: 50 });
            return page.items;
        },
        refetchInterval: poll ? LIST_POLL_MS : false,
    });
}

export function useConversation(id: string | undefined): UseQueryResult<Conversation> {
    return useQuery({
        queryKey: queryKeys.conversation(id ?? ''),
        enabled: Boolean(id),
        queryFn: (): Promise<Conversation> => chatApi.get(id as string),
    });
}

/** Latest messages, newest first (render with an inverted list). */
export function useMessages(
    id: string | undefined,
    { poll = false }: PollOptions = {}
): UseQueryResult<ChatMessage[]> {
    return useQuery({
        queryKey: queryKeys.conversationMessages(id ?? ''),
        enabled: Boolean(id),
        queryFn: async (): Promise<ChatMessage[]> => {
            const page = await chatApi.messages(id as string, { page: 1, limit: 100 });
            return page.items;
        },
        refetchInterval: poll ? THREAD_POLL_MS : false,
    });
}

/** Total unread chat messages, for badges. */
export function useChatUnreadCount({ poll = false }: PollOptions = {}): UseQueryResult<number> {
    return useQuery({
        queryKey: queryKeys.chatUnread(),
        queryFn: async (): Promise<number> => (await chatApi.unreadCount()).count,
        refetchInterval: poll ? BADGE_POLL_MS : false,
    });
}

/** Open (get-or-create) the chat for an accepted application. */
export function useOpenConversation(): UseMutationResult<Conversation, Error, string> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (applicationId: string) => chatApi.open(applicationId),
        onSuccess: (conversation) => {
            qc.setQueryData(queryKeys.conversation(conversation.id), conversation);
            qc.invalidateQueries({ queryKey: queryKeys.conversations(), exact: true });
        },
    });
}

export function useSendMessage(
    conversationId: string
): UseMutationResult<ChatMessage, Error, string> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: string) => chatApi.send(conversationId, body),
        onSuccess: (message) => {
            // Show the sent message immediately; the next poll reconciles.
            qc.setQueryData<ChatMessage[]>(
                queryKeys.conversationMessages(conversationId),
                (prev = []) => (prev.some((m) => m.id === message.id) ? prev : [message, ...prev])
            );
            qc.invalidateQueries({ queryKey: queryKeys.conversations(), exact: true });
        },
    });
}

export function useMarkConversationRead(): UseMutationResult<void, Error, string> {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (conversationId: string) => chatApi.markRead(conversationId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.conversations(), exact: true });
            qc.invalidateQueries({ queryKey: queryKeys.chatUnread() });
            // The backend also marks this thread's message notifications read.
            qc.invalidateQueries({ queryKey: queryKeys.notifications() });
        },
    });
}

export interface StartChat {
    /** Open the application's conversation and navigate to it. */
    start: (applicationId: string) => void;
    isPending: boolean;
}

export function useStartChat(): StartChat {
    const router = useRouter();
    const open = useOpenConversation();
    return {
        start: (applicationId: string): void =>
            open.mutate(applicationId, {
                onSuccess: (conversation) => router.push(`/chat/${conversation.id}` as Href),
            }),
        isPending: open.isPending,
    };
}

/** Application statuses for which the chat exists (accepted work, incl. finished). */
export const CHAT_STATUSES: readonly string[] = ['accepted', 'completed'];

/** "Priya S." style display name with a fallback. */
export function participantName(p: { first_name: string | null; last_name: string | null }): string {
    const first = p.first_name?.trim();
    const lastInitial = p.last_name?.trim().charAt(0);
    if (!first) return 'Tweak user';
    return lastInitial ? `${first} ${lastInitial}.` : first;
}
