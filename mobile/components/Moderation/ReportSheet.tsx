import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableOpacity } from 'react-native';
import type { AxiosError } from 'axios';

import { useTheme } from '@/themes/ThemeProvider';
import { useReport } from '../../hooks/useModeration';
import type { ReportReason, ReportTarget } from '../../types/api';
import { Toast } from '../UI/ToastManager';

// Labels in locales: report.reasons.*
const REASONS: ReportReason[] = ['scam', 'harassment', 'inappropriate', 'spam', 'no_show', 'other'];

interface ReportSheetProps {
    visible: boolean;
    target: { type: ReportTarget; id: string } | null;
    /** e.g. "this tweak", "Priya" */
    subject: string;
    onClose: () => void;
}

export default function ReportSheet({ visible, target, subject, onClose }: ReportSheetProps): React.JSX.Element {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const report = useReport();
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState('');

    const close = (): void => {
        setReason(null);
        setDetails('');
        onClose();
    };

    const submit = (): void => {
        if (!target || !reason) return;
        report.mutate(
            { target_type: target.type, target_id: target.id, reason, details: details.trim() || undefined },
            {
                onSuccess: () => {
                    Toast.success(t('report.thanks'));
                    close();
                },
                onError: (err) => {
                    // Already reported: treat as success for the user.
                    if ((err as AxiosError).response?.status === 409) close();
                },
            }
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={close}>
                <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t('report.title', { subject })}</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 12 }}>
                        {t('report.confidential')}
                    </Text>
                    {REASONS.map((r) => {
                        const selected = reason === r;
                        return (
                            <TouchableOpacity
                                key={r}
                                onPress={() => setReason(r)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}
                                accessibilityRole="radio"
                                accessibilityState={{ selected }}
                            >
                                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? '#DC2626' : colors.textMuted} />
                                <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{t(`report.reasons.${r}`)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    <TextInput
                        value={details}
                        onChangeText={setDetails}
                        placeholder={t('report.details')}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        maxLength={2000}
                        style={{ marginTop: 8, minHeight: 72, textAlignVertical: 'top', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text }}
                    />
                    <TouchableOpacity
                        onPress={submit}
                        disabled={!reason || report.isPending}
                        style={{ marginTop: 16, backgroundColor: '#DC2626', opacity: !reason || report.isPending ? 0.5 : 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                        accessibilityRole="button"
                    >
                        {report.isPending && <ActivityIndicator size="small" color="#fff" />}
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('report.submit')}</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
