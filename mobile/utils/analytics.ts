import api from './api';

/** Client events the backend accepts (business events are recorded server-side). */
export type ClientEvent = 'app_open' | 'tweak_viewed' | 'search_performed' | 'checkout_opened';

export type EventProperties = Record<string, string | number | boolean>;

/** Fire-and-forget: analytics must never surface errors to the user. */
export function track(name: ClientEvent, properties: EventProperties = {}): void {
    api.post('/api/v1/analytics/events', { name, properties }, { headers: { 'X-Silent-Errors': '1' } }).catch(
        () => undefined
    );
}
