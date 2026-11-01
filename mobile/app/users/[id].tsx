import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import ChatAvatar from '@/components/Chat/ChatAvatar';
import ReportSheet from '@/components/Moderation/ReportSheet';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/themes/ThemeProvider';
import { mediaUri } from '@/utils/mediaUpload';

function Stars({ score, size = 14 }: { score: number; size?: number }): React.JSX.Element {
    return (
        <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons key={i} name={score >= i ? 'star' : score >= i - 0.5 ? 'star-half' : 'star-outline'} size={size} color="#F59E0B" />
            ))}
        </View>
    );
}

export default function PublicProfilePage(): React.JSX.Element {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { data: profile, isLoading, isError } = usePublicProfile(id);
    const [reportOpen, setReportOpen] = useState(false);
    const isMe = user?.id === id;

    const header = (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={t('common.goBack')}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{t('publicProfile.title')}</Text>
            {profile && !isMe ? (
                <TouchableOpacity onPress={() => setReportOpen(true)} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={t('publicProfile.reportUser')}>
                    <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            ) : (
                <View style={{ width: 32 }} />
            )}
        </View>
    );

    if (isLoading || isError || !profile) {
        return (
            <ScreenWrapper>
                {header}
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    {isLoading ? <ActivityIndicator color={colors.textMuted} /> : <Text style={{ color: colors.textSecondary }}>{t('publicProfile.unavailable')}</Text>}
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            {header}
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                <View style={{ alignItems: 'center', padding: 24, backgroundColor: colors.surface }}>
                    <ChatAvatar user={{ id: profile.id, first_name: profile.display_name, last_name: null, profile_picture_url: profile.profile_picture_url }} size={88} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{profile.display_name}</Text>
                        {profile.verified && <Ionicons name="shield-checkmark" size={18} color="#16A34A" accessibilityLabel={t('publicProfile.verified')} />}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <Stars score={profile.rating_avg} />
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                            {profile.rating_count > 0 ? `${profile.rating_avg.toFixed(1)} (${profile.rating_count})` : t('publicProfile.noRatings')}
                        </Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                        {t('publicProfile.jobsCompleted', { count: profile.completed_jobs })} · {t('publicProfile.memberSince', { date: dayjs(profile.member_since).format('MMM YYYY') })}
                    </Text>
                    {profile.bio ? <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 12 }}>{profile.bio}</Text> : null}
                </View>

                <View style={{ padding: 20, gap: 24 }}>
                    {profile.skills.length > 0 && (
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 }}>{t('publicProfile.skills')}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {profile.skills.map((s) => (
                                    <View key={s} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border }}>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>{s}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {profile.portfolio.length > 0 && (
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 }}>{t('publicProfile.pastWork')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                {profile.portfolio.map((p) => (
                                    <View key={p.url} style={{ width: 140 }}>
                                        <Image source={{ uri: mediaUri(p.url) }} style={{ width: 140, height: 140, borderRadius: 12, backgroundColor: colors.surfaceMuted }} />
                                        <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{p.tweak_title}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 }}>{t('publicProfile.reviews')}</Text>
                        {profile.reviews.length === 0 ? (
                            <Text style={{ color: colors.textMuted }}>{t('publicProfile.noReviews')}</Text>
                        ) : (
                            profile.reviews.map((r, i) => (
                                <View key={`${r.created_at}-${i}`} style={{ padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontWeight: '700', color: colors.text }}>{r.reviewer_name}</Text>
                                        <Stars score={r.score} size={12} />
                                    </View>
                                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                                        {r.tweak_title} · {dayjs(r.created_at).format('DD MMM YYYY')}
                                    </Text>
                                    {r.comment ? <Text style={{ color: colors.textSecondary, marginTop: 6, lineHeight: 20 }}>{r.comment}</Text> : null}
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
            <ReportSheet
                visible={reportOpen}
                target={{ type: 'user', id: profile.id }}
                subject={profile.display_name}
                onClose={() => setReportOpen(false)}
            />
        </ScreenWrapper>
    );
}
