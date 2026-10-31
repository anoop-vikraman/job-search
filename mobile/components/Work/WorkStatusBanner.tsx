import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React from 'react';
import { Text, View } from 'react-native';

import { useDispute } from '../../hooks/useWorkflow';
import type { BackendApplication } from '../../types/api';
import { formatMinor } from '../../utils/money';
import PhotoStrip from './PhotoStrip';

interface WorkStatusBannerProps {
    application: BackendApplication;
    viewer: 'lister' | 'provider';
}

const OUTCOME_TEXT = {
    release: 'Resolved: payment released to the provider.',
    refund: 'Resolved: payment refunded to the lister.',
    partial: 'Resolved: payment split between both sides.',
} as const;

/** Where accepted work stands: submitted (review window), disputed, or dispute resolved. */
export default function WorkStatusBanner({ application, viewer }: WorkStatusBannerProps): React.JSX.Element | null {
    const everDisputed = application.status === 'disputed' || application.status === 'withdrawn' || application.status === 'completed';
    const { data: dispute } = useDispute(application.id, everDisputed);

    if (application.status === 'disputed' || (dispute && dispute.status === 'open')) {
        return (
            <Banner
                icon="shield-half-outline"
                color="#B45309"
                bg="#FFFBEB"
                title="Under review by Tweak support"
                body={dispute ? `Reason: ${dispute.reason}` : 'Payment is on hold until support decides.'}
            />
        );
    }
    if (dispute && dispute.status === 'resolved' && dispute.outcome) {
        const amount = dispute.outcome === 'partial' && dispute.provider_amount_minor != null
            ? ` Provider received ${formatMinor(dispute.provider_amount_minor)} before fees.`
            : '';
        return (
            <Banner
                icon="checkmark-done-circle-outline"
                color="#166534"
                bg="#F0FDF4"
                title="Dispute resolved"
                body={OUTCOME_TEXT[dispute.outcome] + amount + (dispute.admin_note ? ` Note: ${dispute.admin_note}` : '')}
            />
        );
    }
    if (application.status === 'accepted' && application.work_submitted_at) {
        const when = application.auto_release_at ? dayjs(application.auto_release_at).format('DD MMM, HH:mm') : null;
        const deadline = when
            ? viewer === 'provider'
                ? `Payment releases automatically on ${when} unless the lister disputes.`
                : `Confirm or open a dispute before ${when}, or payment releases automatically.`
            : '';
        const note = application.completion_note ? `“${application.completion_note}”\n` : '';
        return (
            <Banner
                icon="hourglass-outline"
                color="#1D4ED8"
                bg="#EFF6FF"
                title={viewer === 'provider' ? 'Waiting for the lister to confirm' : 'The provider marked this done'}
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
