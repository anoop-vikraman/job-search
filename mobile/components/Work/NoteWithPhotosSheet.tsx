import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/themes/ThemeProvider';
import { pickAndUploadPhotos } from '../../utils/mediaUpload';
import { Toast } from '../UI/ToastManager';
import PhotoStrip from './PhotoStrip';

const MAX_PHOTOS = 6;

export interface NoteWithPhotos {
    note: string;
    photoUrls: string[];
}

interface NoteWithPhotosSheetProps {
    visible: boolean;
    title: string;
    description: string;
    placeholder: string;
    submitLabel: string;
    /** Minimum note length (0 = optional). */
    minLength?: number;
    tone?: 'primary' | 'danger';
    submitting: boolean;
    onClose: () => void;
    onSubmit: (value: NoteWithPhotos) => void;
}

/** Bottom sheet collecting a note and optional photos (work completion, disputes). */
export default function NoteWithPhotosSheet({
    visible,
    title,
    description,
    placeholder,
    submitLabel,
    minLength = 0,
    tone = 'primary',
    submitting,
    onClose,
    onSubmit,
}: NoteWithPhotosSheetProps): React.JSX.Element {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const [note, setNote] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const trimmed = note.trim();
    const valid = trimmed.length >= minLength;
    const accent = tone === 'danger' ? '#DC2626' : '#007AFF';

    const addPhotos = async (): Promise<void> => {
        setUploading(true);
        try {
            const urls = await pickAndUploadPhotos(MAX_PHOTOS - photos.length);
            setPhotos((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
        } catch {
            Toast.error(t('common.photosUploadFailed'));
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
                <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{title}</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 14 }}>{description}</Text>
                    <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        maxLength={2000}
                        style={{ minHeight: 96, maxHeight: 180, textAlignVertical: 'top', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text, fontSize: 15 }}
                    />
                    {minLength > 0 && trimmed.length < minLength && (
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                            {t('work.minChars', { min: minLength, current: trimmed.length })}
                        </Text>
                    )}
                    <View style={{ marginTop: 14, gap: 10 }}>
                        <PhotoStrip urls={photos} onRemove={(url) => setPhotos((prev) => prev.filter((p) => p !== url))} />
                        {photos.length < MAX_PHOTOS && (
                            <TouchableOpacity
                                onPress={addPhotos}
                                disabled={uploading}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                                accessibilityRole="button"
                            >
                                {uploading ? <ActivityIndicator size="small" color={colors.textMuted} /> : <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />}
                                <Text style={{ fontWeight: '600', color: colors.textSecondary }}>{t('work.addPhotos', { count: photos.length, max: MAX_PHOTOS })}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => onSubmit({ note: trimmed, photoUrls: photos })}
                        disabled={!valid || submitting || uploading}
                        style={{ marginTop: 20, backgroundColor: accent, opacity: !valid || submitting || uploading ? 0.5 : 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                        accessibilityRole="button"
                    >
                        {submitting && <ActivityIndicator size="small" color="#fff" />}
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{submitLabel}</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
