import api from '../utils/api';
import type { MediaUploadResponse } from '../types/api';

export interface MediaFile {
    uri: string;
    name: string;
    type: string;
}

export const mediaApi = {
    /**
     * Upload a single file via multipart form-data. React Native's FormData
     * accepts a `{ uri, name, type }` object for the file part.
     */
    upload: async (file: MediaFile): Promise<MediaUploadResponse> => {
        const form = new FormData();
        // React Native FormData file part shape; cast through unknown to satisfy
        // the DOM FormData typings without using `any`.
        form.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.type,
        } as unknown as Blob);

        const res = await api.post('/api/v1/media/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
};
