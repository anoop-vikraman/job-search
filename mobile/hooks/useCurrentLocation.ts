import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export interface Coords {
    lat: number;
    lng: number;
}

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'error';

export type LocateResult =
    | { coords: Coords; error: null }
    | { coords: null; error: 'denied' | 'error' };

export interface CurrentLocation {
    coords: Coords | null;
    status: LocationStatus;
    /** Ask for foreground permission (if needed) and read the device position. */
    locate: () => Promise<LocateResult>;
    clear: () => void;
}

// ~110 m precision: enough for "near me", keeps query keys stable between fixes,
// and avoids sending the device's exact position.
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

function toCoords(position: Location.LocationObject): Coords {
    return { lat: round3(position.coords.latitude), lng: round3(position.coords.longitude) };
}

/**
 * On-demand device location for "near me" features. Uses the last known fix when
 * available so the feed updates quickly, then refines with a fresh reading.
 */
export function useCurrentLocation(): CurrentLocation {
    const [coords, setCoords] = useState<Coords | null>(null);
    const [status, setStatus] = useState<LocationStatus>('idle');

    const locate = useCallback(async (): Promise<LocateResult> => {
        setStatus('locating');
        let best: Coords | null = null;
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') {
                setStatus('denied');
                return { coords: null, error: 'denied' };
            }
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown) {
                best = toCoords(lastKnown);
                setCoords(best);
                setStatus('ready');
            }
            const fresh = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const next = toCoords(fresh);
            // Only update when the rounded position moved, to avoid a duplicate fetch.
            if (!best || best.lat !== next.lat || best.lng !== next.lng) {
                setCoords(next);
            }
            setStatus('ready');
            return { coords: next, error: null };
        } catch {
            // A last-known fix is still usable if the fresh reading failed.
            setStatus(best ? 'ready' : 'error');
            return best ? { coords: best, error: null } : { coords: null, error: 'error' };
        }
    }, []);

    const clear = useCallback((): void => {
        setCoords(null);
        setStatus('idle');
    }, []);

    return { coords, status, locate, clear };
}
