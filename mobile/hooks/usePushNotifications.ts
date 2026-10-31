import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { registerForPush } from '../utils/push';
import { routeForNotification, toNotificationTarget } from '../utils/notificationRoutes';
import { queryKeys } from './queryKeys';

// Show pushes as banners even while the app is in the foreground.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/**
 * App-level push wiring (mount once, inside the QueryClientProvider):
 * - registers the device token whenever a user is signed in,
 * - refreshes notification/chat queries when a push arrives,
 * - navigates on tap, including taps that cold-start the app.
 */
export function usePushNotifications(isAuthenticated: boolean): void {
    const router = useRouter();
    const qc = useQueryClient();
    const lastResponse = Notifications.useLastNotificationResponse();

    useEffect(() => {
        if (isAuthenticated) void registerForPush();
    }, [isAuthenticated]);

    useEffect(() => {
        const sub = Notifications.addNotificationReceivedListener(() => {
            qc.invalidateQueries({ queryKey: queryKeys.notifications() });
            qc.invalidateQueries({ queryKey: queryKeys.conversations() });
        });
        return () => sub.remove();
    }, [qc]);

    useEffect(() => {
        // Wait for sign-in so the target screen's queries are authorized; the response
        // stays "last" until cleared, so a tap made while signed out is handled after login.
        if (!isAuthenticated || !lastResponse) return;
        if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
        const data = lastResponse.notification.request.content.data as Record<string, unknown> | undefined;
        router.push(routeForNotification(toNotificationTarget(data)));
        Notifications.clearLastNotificationResponse();
    }, [isAuthenticated, lastResponse, router]);
}
