import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import MapView, { Callout, Circle, Marker, type Region } from 'react-native-maps';

import { useTheme } from '@/themes/ThemeProvider';
import type { Tweak } from '../../store/useTweaksStore';

interface TweakMapProps {
    tweaks: Tweak[];
    /** Viewer position (when "Near me" is on). */
    center: { lat: number; lng: number } | null;
    radiusKm: number | null;
    onOpen: (tweakId: string) => void;
}

const INDIA: Region = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 18, longitudeDelta: 18 };

/**
 * Feed tweaks on a map. Pins use the API's approximate coordinates (snapped to ~550 m),
 * never the lister's exact address; remote tweaks have none and aren't shown.
 */
export default function TweakMap({ tweaks, center, radiusKm, onOpen }: TweakMapProps): React.JSX.Element {
    const { colors } = useTheme();
    const pins = useMemo(
        () => tweaks.filter((t): t is Tweak & { approxLat: number; approxLng: number } => t.approxLat != null && t.approxLng != null),
        [tweaks]
    );

    const initialRegion = useMemo<Region>(() => {
        if (center) {
            const km = radiusKm ?? 10;
            const delta = Math.max(0.02, (km * 2.4) / 111);
            return { latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta };
        }
        if (pins.length > 0) {
            const lats = pins.map((p) => p.approxLat);
            const lngs = pins.map((p) => p.approxLng);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
            return {
                latitude: (minLat + maxLat) / 2,
                longitude: (minLng + maxLng) / 2,
                latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.4),
                longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.4),
            };
        }
        return INDIA;
    }, [center, radiusKm, pins]);

    return (
        <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 90 }}>
            <MapView style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation={Boolean(center)}>
                {center && radiusKm != null && (
                    <Circle
                        center={{ latitude: center.lat, longitude: center.lng }}
                        radius={radiusKm * 1000}
                        strokeColor="rgba(0,122,255,0.5)"
                        fillColor="rgba(0,122,255,0.08)"
                    />
                )}
                {pins.map((t) => (
                    <Marker key={t.id} coordinate={{ latitude: t.approxLat, longitude: t.approxLng }} pinColor="#007AFF">
                        <Callout onPress={() => onOpen(t.id)}>
                            <View style={{ maxWidth: 220, padding: 4 }}>
                                <Text style={{ fontWeight: '800' }} numberOfLines={1}>{t.title || t.category}</Text>
                                <Text style={{ color: '#475569', fontSize: 12 }}>
                                    {t.category}
                                    {t.price ? ` · ₹${t.price}` : ''}
                                    {t.distanceKm != null ? ` · ${t.distanceKm.toFixed(1)} km` : ''}
                                </Text>
                                <Text style={{ color: '#007AFF', fontSize: 12, marginTop: 2 }}>Tap to open · approx. area</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>
            {pins.length === 0 && (
                <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 12 }}>
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                        No onsite tweaks with a location in these results.
                    </Text>
                </View>
            )}
        </View>
    );
}
