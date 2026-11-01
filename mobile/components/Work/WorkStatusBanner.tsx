import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useDispute } from '../../hooks/useWorkflow';
import type { BackendApplication } from '../../types/api';
import { formatMinor } from '../../utils/money';
import PhotoStrip from './PhotoStrip';

interface WorkStatusBannerProps {
    application: BackendApplication;
    viewer: 'lister' | 'provider';
}

const OUTCOME_KEY = {
    release: 'work.outcomeRelease',
    refund: 'work.outcomeRefund',
    partial: 'work.outcomePartial',
} as const;

/** Where accepted work stands: submitted (review window), disputed, or dispute resolved. */
export default function WorkStatusBanner({ application, viewer }: WorkStatusBannerProps): React.JSX.Element | null {
    const everDisputed = application.status === 'disputed' || application.status === 'withdrawn' || application.status === 'completed';
    const { data: dispute } = useDispute(application.id, everDisputed);
    const { t } = useTranslation();

    if (application.status === 'disputed' || (dispute && dispute.status === 'open')) {
        return (
            <Banner
                icon="shield-half-outline"
                color="#B45309"
                bg="#FFFBEB"
                title={t('work.underReview')}
                body={dispute ? t('work.disputeReason', { reason: dispute.reason }) : t('work.onHold')}
            />
        );
    }
    if (dispute && dispute.status === 'resolved' && dispute.outcome) {
        const amount = dispute.outcome === 'partial' && dispute.provider_amount_minor != null
            ? ` ${t('work.providerReceived', { amount: formatMinor(dispute.provider_amount_minor) })}`
            : '';
        return (
            <Banner
                icon="checkmark-done-circle-outline"
                color="#166534"
                bg="#F0FDF4"
                title={t('work.resolved')}
                body={t(OUTCOME_KEY[dispute.outcome]) + amount + (dispute.admin_note ? ` ${t('work.adminNote', { note: dispute.admin_note })}` : '')}
            />
        );
    }
    if (application.status === 'accepted' && application.work_submitted_at) {
        const when = application.auto_release_at ? dayjs(application.auto_release_at).format('DD MMM, HH:mm') : null;
        const deadline = when
            ? viewer === 'provider'
                ? t('work.autoReleaseProvider', { when })
                : t('work.autoReleaseLister', { when })
            : '';
        const note = application.completion_note ? `“${application.completion_note}”\n` : '';
        return (
            <Banner
                icon="hourglass-outline"
                color="#1D4ED8"
                bg="#EFF6FF"
                title={viewer === 'provider' ? t('work.waitingForLister') : t('work.providerMarkedDone')}
                body={note + deadline}
                extra={
                    application.completion_photos.length > 0 ? (
                        <View style={{ marginTop: 10 }}>
                            <PhotoStrip urls={application.completion_photos.map((p) => p.url)} size={64} />
                        </View>
                    ) : undefined
                }
            />
        );
    }
    return null;
}

function Banner({
    icon,
    color,
    bg,
    title,
    body,
    extra,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    bg: string;
    title: string;
    body: string;
    extra?: React.ReactNode;
}): React.JSX.Element {
    return (
        <View style={{ backgroundColor: bg, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: `${color}33` }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name={icon} size={18} color={color} />
                <Text style={{ fontWeight: '800', color, fontSize: 14 }}>{title}</Text>
            </View>
            <Text style={{ color: '#334155', fontSize: 13, lineHeight: 19 }}>{body}</Text>
            {extra}
        </View>
    );
}
