import type { Href } from 'expo-router';

/** Routing hints carried by notifications (push `data` or an in-app Notification row). */
export interface NotificationTarget {
    type?: string;
    tweak_id?: string | null;
    conversation_id?: string | null;
}

/** Narrow an untyped push `data` payload to the fields we route on. */
export function toNotificationTarget(data: Record<string, unknown> | undefined): NotificationTarget {
    const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
    return {
        type: str(data?.type),
        tweak_id: str(data?.tweak_id),
        conversation_id: str(data?.conversation_id),
    };
}

/** Where tapping a notification should take the user. */
export function routeForNotification(target: NotificationTarget): Href {
    const { type, tweak_id: tweakId, conversation_id: conversationId } = target;
    switch (type) {
        case 'new_message':
            return (conversationId ? `/chat/${conversationId}` : '/chat') as Href;
        case 'application_received':
            if (tweakId) return `/tweaks/${tweakId}/applicants` as Href;
            break;
        case 'application_accepted':
        case 'application_rejected':
        case 'counter_offer':
        case 'tweak_completed':
            if (tweakId) return `/tweaks/${tweakId}` as Href;
            break;
        case 'refund_processed':
            return '/refunds' as Href;
        case 'wallet_topup':
            return '/wallet' as Href;
    }
    return (tweakId ? `/tweaks/${tweakId}` : '/(tabs)/notifications') as Href;
}
