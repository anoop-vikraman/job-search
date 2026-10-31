import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React from 'react';
import {
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTweak, useTweakApplicationsRaw } from '@/hooks/useTweaks';
import { formatMinor } from '@/utils/money';
import { palette } from '@tweak/theme';
import { useTheme } from '@/themes/ThemeProvider';

export default function TweakApplicants(): React.JSX.Element {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const { data: tweak } = useTweak(id as string);
    const { data: applicants = [] } = useTweakApplicationsRaw(id as string);

    if (!tweak) {
        return (
            <ScreenWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.textSecondary }}>Tweak not found.</Text>
                </View>
            </ScreenWrapper>
        );
    }

    const getStatusStyle = (status: string): { bg: string; text: string } => {
        switch (status) {
            case 'accepted':
            case 'completed':
                return { bg: palette.green100, text: palette.green700 };
            case 'rejected':
            case 'withdrawn':
                return { bg: palette.red100, text: palette.red700 };
            default:
                return { bg: colors.neutralBg, text: colors.neutralFg };
        }
    };

    return (
        <ScreenWrapper>
            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 16, paddingVertical: 14,
                backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
            }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Applicants</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' }}>{tweak.category}</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            <FlatList
                data={applicants}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textSecondary }}>No applicants yet</Text>
                        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 }}>
                            When people apply to this tweak, they will appear here.
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const statusStyle = getStatusStyle(item.status);
                    const providerName = [item.provider.first_name, item.provider.last_name]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                    const displayName = providerName || item.provider_user_id.slice(0, 8);
                    const skillsLabel = item.provider.skills.slice(0, 3).join(' · ');
                    const quoteLabel =
                        item.quoted_price_minor != null
                            ? formatMinor(item.quoted_price_minor)
                            : tweak.price != null
                              ? `₹${tweak.price}`
                              : '—';
                    return (
                        <TouchableOpacity
                            onPress={() => router.push(`/tweaks/${tweak.id}/applicants/${item.id}` as Href)}
                            activeOpacity={0.7}
                            style={{
                                backgroundColor: colors.surface,
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            {/* Avatar */}
                            {item.provider.profile_picture_url ? (
                                <Image
                                    source={{ uri: item.provider.profile_picture_url }}
                                    style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceMuted }}
                                />
                            ) : (
                                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textSecondary }}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}

                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{displayName}</Text>
                                    <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: statusStyle.text, textTransform: 'uppercase' }}>
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>

                                {item.provider.rating_count > 0 ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                                        <Ionicons name="star" size={12} color={palette.amber500} />
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                                            {item.provider.rating_avg.toFixed(1)} ({item.provider.rating_count})
                                        </Text>
                                    </View>
                                ) : null}

                                {skillsLabel ? (
                                    <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                                        {skillsLabel}
                                    </Text>
                                ) : null}

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Quote:</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: palette.iosBlue }}>
                                        {quoteLabel}
                                    </Text>
                                </View>

                                {item.why_prefer_message ? (
                                    <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>
                                        {item.why_prefer_message}
                                    </Text>
                                ) : null}
                            </View>

                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </ScreenWrapper>
    );
}
