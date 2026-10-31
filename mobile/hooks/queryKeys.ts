// Centralized TanStack Query keys so invalidation stays consistent across hooks.
export const queryKeys = {
    // Prefix ['tweaks', 'feed'] is invalidated after create/delete; the filters object keys the cache.
    tweaksFeed: (filters: object = {}) => ['tweaks', 'feed', filters] as const,
    tweaksMine: () => ['tweaks', 'mine'] as const,
    tweak: (id: string) => ['tweaks', 'detail', id] as const,
    tweakApplications: (id: string) => ['tweaks', id, 'applications'] as const,
    myApplications: () => ['tweaks', 'applications', 'mine'] as const,
    wallet: () => ['wallet'] as const,
    walletTransactions: () => ['wallet', 'transactions'] as const,
    refunds: () => ['refunds'] as const,
    watchlist: () => ['watchlist'] as const,
    notifications: () => ['notifications'] as const,
    notificationsUnread: () => ['notifications', 'unread-count'] as const,
};
