import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let enabled = false;

/** Start Sentry crash/error reporting. No-op without EXPO_PUBLIC_SENTRY_DSN. */
export function initObservability(): void {
    if (!DSN || enabled) return;
    Sentry.init({
        dsn: DSN,
        environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production'),
        sendDefaultPii: false,
        tracesSampleRate: 0,
        // Drop auth headers from captured network breadcrumbs.
        beforeBreadcrumb: (crumb) => {
            if (crumb.data && typeof crumb.data === 'object' && 'request_headers' in crumb.data) {
                delete (crumb.data as Record<string, unknown>).request_headers;
            }
            return crumb;
        },
    });
    enabled = true;
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
    if (!enabled) return;
    Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** Attach the signed-in user's id (no name/phone) to future reports. */
export function setReportingUser(userId: string | null): void {
    if (!enabled) return;
    Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
