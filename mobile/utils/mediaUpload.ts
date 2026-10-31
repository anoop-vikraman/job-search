import * as ImagePicker from 'expo-image-picker';

import { mediaApi } from '../api/media';
import { config } from './config';

/** Uploaded media URLs are server-relative (`/media/...`); make them loadable by <Image>. */
export function mediaUri(url: string): string {
    return /^https?:\/\//i.test(url) ? url : `${config.API_URL}${url}`;
}

/**
 * Let the user pick up to `max` photos and upload them. Returns the uploaded URLs
 * (empty when cancelled or permission is denied).
 */
export async function pickAndUploadPhotos(max: number): Promise<string[]> {
    if (max <= 0) return [];
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return [];
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: max,
        quality: 0.7,
    });
    if (result.canceled) return [];
    const uploads = result.assets.slice(0, max).map((asset, i) =>
        mediaApi.upload({
            uri: asset.uri,
            name: asset.fileName ?? `photo-${Date.now()}-${i}.jpg`,
            type: asset.mimeType ?? 'image/jpeg',
        })
    );
    return (await Promise.all(uploads)).map((r) => r.url);
}
