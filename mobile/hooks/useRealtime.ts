import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useRealtimeStore } from '../store/useRealtimeStore';
import { config } from '../utils/config';
import { secureStorage } from '../utils/storage';
import { queryKeys } from './queryKeys';

const MAX_BACKOFF_MS = 30000;
const PING_EVERY_MS = 25000;

interface ServerEvent {
    type: string;
    conversation_id?: string;
}

function wsUrl(): string {
    return `${config.API_URL.replace(/^http/i, 'ws')}/api/v1/ws`;
}

/**
 * Keeps one WebSocket to /api/v1/ws while signed in and the app is in the foreground.
 * Events only say *what* changed; the matching queries are refetched over REST.
 * Reconnects with exponential backoff; chat falls back to polling while disconnected.
 */
export function useRealtime(isAuthenticated: boolean): void {
    const qc = useQueryClient();

    useEffect(() => {
        if (!isAuthenticated) return;
        const setConnected = useRealtimeStore.getState().setConnected;
        let socket: WebSocket | null = null;
        let retry: ReturnType<typeof setTimeout> | null = null;
        let ping: ReturnType<typeof setInterval> | null = null;
        let attempts = 0;
        let active = true;

        const onEvent = (event: ServerEvent): void => {
            const id = event.conversation_id;
            if (event.type === 'message' && id) {
                qc.invalidateQueries({ queryKey: queryKeys.conversationMessages(id) });
                qc.invalidateQueries({ queryKey: queryKeys.conversations(), exact: true });
                qc.invalidateQueries({ queryKey: queryKeys.chatUnread() });
                qc.invalidateQueries({ queryKey: queryKeys.conversation(id) });
            } else if (event.type === 'read' && id) {
                qc.invalidateQueries({ queryKey: queryKeys.conversation(id) });
            }
        };

        const cleanup = (): void => {
            if (ping) clearInterval(ping);
            ping = null;
            if (socket) {
                socket.onclose = null;
                socket.close();
            }
            socket = null;
            setConnected(false);
        };

        const scheduleReconnect = (): void => {
            if (!active || retry) return;
            const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempts);
            attempts += 1;
            retry = setTimeout(() => {
                retry = null;
                void connect();
            }, delay);
        };

        const connect = async (): Promise<void> => {
            const token = await secureStorage.get('access_token');
            if (!active || !token) return;
            const ws = new WebSocket(wsUrl());
            socket = ws;
            ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
            ws.onmessage = (msg) => {
                let event: ServerEvent;
                try {
                    event = JSON.parse(String(msg.data)) as ServerEvent;
                } catch {
                    return;
                }
                if (event.type === 'ready') {
                    attempts = 0;
                    setConnected(true);
                    // Catch up on anything that happened while disconnected.
                    qc.invalidateQueries({ queryKey: queryKeys.conversations() });
                    ping = setInterval(() => ws.send(JSON.stringify({ type: 'ping' })), PING_EVERY_MS);
                    return;
                }
                onEvent(event);
            };
            ws.onclose = () => {
                if (ping) clearInterval(ping);
                ping = null;
                socket = null;
                setConnected(false);
                // 4401 = token rejected (expired): the next REST call refreshes it, so retry.
                scheduleReconnect();
            };
        };

        void connect();
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                if (!socket) void connect();
            } else {
                if (retry) clearTimeout(retry);
                retry = null;
                cleanup();
            }
        });

        return () => {
            active = false;
            sub.remove();
            if (retry) clearTimeout(retry);
            cleanup();
        };
    }, [isAuthenticated, qc]);
}
