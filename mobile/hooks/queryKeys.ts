// Centralized TanStack Query keys so invalidation stays consistent across hooks.
export const queryKeys = {
    // Prefix ['tweaks', 'feed'] is invalidated after create/delete; the filters object keys the cache.
    tweaksFeed: (filters: object = {}) => ['tweaks', 'feed', filters] as const,
    tweaksMine: () => ['tweaks', 'mine'] as const,
    tweak: (id: string) => ['tweaks', 'detail', id] as const,
    tweakApplications: (id: string) => ['tweaks', id, 'applications'] as const,
    myApplications: () => ['tweaks', 'applications', 'mine'] as const,
    dispute: (applicationId: string) => ['disputes', applicationId] as const,
    blockedUsers: () => ['blocked-users'] as const,
    wallet: () => ['wallet'] as const,
    walletTransactions: () => ['wallet', 'transactions'] as const,
    refunds: () => ['refunds'] as const,
    watchlist: () => ['watchlist'] as const,
    notifications: () => ['notifications'] as const,
    notificationsUnread: () => ['notifications', 'unread-count'] as const,
    notificationPreferences: () => ['notification-preferences'] as const,
    conversations: () => ['conversations'] as const,
    conversation: (id: string) => ['conversations', 'detail', id] as const,
    conversationMessages: (id: string) => ['conversations', 'messages', id] as const,
    chatUnread: () => ['conversations', 'unread-count'] as const,
};
