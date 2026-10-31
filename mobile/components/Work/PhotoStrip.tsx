import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';

import { mediaUri } from '../../utils/mediaUpload';

interface PhotoStripProps {
    urls: string[];
    size?: number;
    onRemove?: (url: string) => void;
}

/** Horizontal row of uploaded photo thumbnails. */
export default function PhotoStrip({ urls, size = 72, onRemove }: PhotoStripProps): React.JSX.Element | null {
    if (urls.length === 0) return null;
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {urls.map((url) => (
                <View key={url}>
                    <Image source={{ uri: mediaUri(url) }} style={{ width: size, height: size, borderRadius: 10, backgroundColor: '#E2E8F0' }} />
                    {onRemove && (
                        <TouchableOpacity
                            onPress={() => onRemove(url)}
                            style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 12 }}
                            accessibilityRole="button"
                            accessibilityLabel="Remove photo"
                        >
                            <Ionicons name="close-circle" size={22} color="#DC2626" />
                        </TouchableOpacity>
                    )}
                </View>
            ))}
        </ScrollView>
    );
}
