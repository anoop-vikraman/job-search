import { CATEGORIES, getCategoryMeta } from '@/constants/categories';
import { themeColors } from '@/themes/colors';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Tweak } from '../../store/useTweaksStore';

// ─── Constants ──────────────────────────────────────────────────────────────

const SCHEDULE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    one_day: { label: 'Single Day', color: '#3B82F6', bg: '#EFF6FF' },
    deadline: { label: 'Deadline', color: '#F97316', bg: '#FFF7ED' },
    few_days: { label: 'Multi-Day', color: '#10B981', bg: '#ECFDF5' },
};

export function getScheduleMeta(pref: string) {
    return SCHEDULE_LABELS[pref] ?? { label: pref, color: '#6B7280', bg: '#F3F4F6' };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function calculateHours(start: string, end: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

export interface DateDisplay {
    dateText: string;
    daysText: string | null;
    hoursText: string | null;
    slotType: 'availability' | 'working_time' | null;
}

export function getDateDisplay(item: Tweak): DateDisplay {
    const sd = item.scheduleData;
    const pref = item.schedulePreference;
    const slotType: 'availability' | 'working_time' | null = sd?.slotType ?? null;

    if (!sd) return { dateText: '—', daysText: null, hoursText: null, slotType: null };

    if (pref === 'one_day') {
        const date = sd.date ? dayjs(sd.date).format('ddd, DD MMM YYYY') : '—';
        let hoursText: string | null = null;
        if (slotType === 'working_time') {
            const slots: { start: string; end: string }[] = sd.timeSlots ?? [];
            const totalH = slots.reduce((acc, s) => acc + calculateHours(s.start, s.end), 0);
            if (totalH > 0) hoursText = `${totalH.toFixed(1)} hrs`;
        }
        return { dateText: date, daysText: null, hoursText, slotType };
    }

    if (pref === 'deadline') {
        const deadline = sd.date ? dayjs(sd.date).format('ddd, DD MMM YYYY') : '—';
        const slots: { start: string; end: string }[] = sd.deadlineSlots ?? [];
        const days = slots.length;
        return {
            dateText: `Deadline: ${deadline}`,
            daysText: days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : null,
            hoursText: null,
            slotType: null,
        };
    }

    if (pref === 'few_days') {
        const slots: { date: string; start: string; end: string }[] = sd.fewDaysSlots ?? [];
        if (slots.length === 0) return { dateText: '—', daysText: null, hoursText: null, slotType };
        const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date));
        const start = dayjs(sorted[0].date).format('DD MMM');
        const end = dayjs(sorted[sorted.length - 1].date).format('DD MMM YYYY');
        const days = slots.length;
        let hoursText: string | null = null;
        if (slotType === 'working_time') {
            const totalH = sd.totalHours ?? slots.reduce((acc, s) => acc + calculateHours(s.start, s.end), 0);
            if (totalH > 0) hoursText = `${(totalH as number).toFixed(1)} hrs`;
        }
        return {
            dateText: `${start} → ${end}`,
            daysText: `${days} day${days !== 1 ? 's' : ''}`,
            hoursText,
            slotType,
        };
    }

    return { dateText: '—', daysText: null, hoursText: null, slotType: null };
}

// ─── TweakTile Component ────────────────────────────────────────────────────

interface TweakTileProps {
    item: Tweak;
    onPress: () => void;
    showAddress?: boolean;
    currentUserId?: string;
    onViewApplicants?: () => void;
}

export default function TweakTile({
    item,
    onPress,
    showAddress = false,
    currentUserId,
    onViewApplicants,
}: TweakTileProps) {
    const catMeta = getCategoryMeta(item.category ?? '');
    const scheduleMeta = getScheduleMeta(item.schedulePreference);
    const { dateText, daysText, hoursText, slotType } = getDateDisplay(item);
    const hasImage = item.images && item.images.length > 0;
    const isOnsite = item.tweakType === 'in_person';
    const addressLabel = item.address?.saveAs ?? item.address?.city ?? null;
    const canShowAddress = (showAddress || item.status === 'draft') && isOnsite && addressLabel;

    const showSlotBadge = item.schedulePreference === 'few_days' && slotType != null;
    const slotBadge = slotType === 'working_time'
        ? { label: 'Fixed Work Time', color: '#7C3AED', bg: '#F5F3FF' }
        : { label: 'Availability', color: '#0284C7', bg: '#F0F9FF' };

    // Find application by current user
    const myApplication = currentUserId ? item.applications?.find(a => a.userId === currentUserId) : null;
    const appStatus = myApplication?.status;

    const applicantsCount = item.applications?.length || 0;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderLeftWidth: 4,
                borderLeftColor: scheduleMeta.color,
            }}
        >
            <View style={{ flexDirection: 'row', padding: 14, paddingBottom: 10, gap: 12 }}>
                {hasImage ? (
                    <Image
                        source={{ uri: item.images[0]?.uri }}
                        style={{ width: 68, height: 68, borderRadius: 12, backgroundColor: '#F1F5F9', alignSelf: 'center' }}
                    />
                ) : (
                    <View
                        style={{
                            width: 68,
                            height: 68,
                            borderRadius: 12,
                            backgroundColor: `${catMeta.color}18`,
                            alignItems: 'center',
                            justifyContent: 'center',
                            alignSelf: 'center',
                        }}
                    >
                        <Ionicons name={catMeta.icon as any} size={28} color={catMeta.color} />
                    </View>
                )}

                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                        <Text
                            style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 8 }}
                            numberOfLines={1}
                        >
                            {item.category || 'Uncategorized'}
                        </Text>

                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            {/* Price / Status */}
                            {item.status === 'draft' ? (
                                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#B45309', letterSpacing: 0.5 }}>DRAFT</Text>
                                </View>
                            ) : appStatus ? (
                                <View style={{ 
                                    backgroundColor: appStatus === 'accepted' ? '#DCFCE7' : appStatus === 'rejected' ? '#FEE2E2' : '#EFF6FF', 
                                    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 
                                }}>
                                    <Text style={{ 
                                        fontSize: 9, fontWeight: '800', 
                                        color: appStatus === 'accepted' ? '#15803D' : appStatus === 'rejected' ? '#B91C1C' : '#1D4ED8',
                                        letterSpacing: 0.5 
                                    }}>
                                        {appStatus.toUpperCase()}
                                    </Text>
                                </View>
                            ) : (
                                item.price != null && (
                                    <View style={{ backgroundColor: `${themeColors.primary}18`, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: themeColors.primary }}>
                                            ₹{item.price}
                                            <Text style={{ fontSize: 10, fontWeight: '500' }}>
                                                {item.pricingType === 'hourly' ? '/hr' : item.pricingType === 'quantity' ? '/item' : ''}
                                            </Text>
                                        </Text>
                                    </View>
                                )
                            )}
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                        {item.schedulePreference && (
                            <View style={{
                                backgroundColor: scheduleMeta.bg,
                                paddingHorizontal: 7,
                                paddingVertical: 3,
                                borderRadius: 20,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 3,
                            }}>
                                <Ionicons
                                    name={
                                        item.schedulePreference === 'one_day' ? 'calendar-outline' :
                                        item.schedulePreference === 'deadline' ? 'hourglass-outline' :
                                        'calendar-number-outline'
                                    }
                                    size={10}
                                    color={scheduleMeta.color}
                                />
                                <Text style={{ fontSize: 10, fontWeight: '700', color: scheduleMeta.color }}>
                                    {scheduleMeta.label}
                                </Text>
                            </View>
                        )}

                        <View style={{
                            backgroundColor: isOnsite ? '#F0F9FF' : '#F5F3FF',
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                        }}>
                            <Ionicons
                                name={isOnsite ? 'location-outline' : 'globe-outline'}
                                size={10}
                                color={isOnsite ? '#0284C7' : '#7C3AED'}
                            />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isOnsite ? '#0284C7' : '#7C3AED' }}>
                                {isOnsite ? 'Onsite' : 'Remote'}
                            </Text>
                        </View>

                        {showSlotBadge && (
                            <View style={{
                                backgroundColor: slotBadge.bg,
                                paddingHorizontal: 7,
                                paddingVertical: 3,
                                borderRadius: 20,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 3,
                            }}>
                                <Ionicons
                                    name={slotType === 'working_time' ? 'briefcase-outline' : 'time-outline'}
                                    size={10}
                                    color={slotBadge.color}
                                />
                                <Text style={{ fontSize: 10, fontWeight: '700', color: slotBadge.color }}>
                                    {slotBadge.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    {item.skills && item.skills.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 4 }}
                        >
                            {item.skills.map((skill, idx) => (
                                <View
                                    key={idx}
                                    style={{
                                        backgroundColor: '#F8FAFC',
                                        borderWidth: 1,
                                        borderColor: '#E2E8F0',
                                        paddingHorizontal: 7,
                                        paddingVertical: 2,
                                        borderRadius: 20,
                                    }}
                                >
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>{skill}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </View>

            {/* ── BOTTOM BAR ── */}
            <View style={{
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                paddingHorizontal: 14,
                paddingVertical: 9,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
            }}>
                {/* Date */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="calendar-clear-outline" size={11} color="#94A3B8" />
                    <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>{dateText}</Text>
                </View>

                {/* Days count */}
                {daysText && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="layers-outline" size={11} color="#94A3B8" />
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>{daysText}</Text>
                    </View>
                )}

                {/* Hours */}
                {hoursText && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="time-outline" size={11} color="#94A3B8" />
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>{hoursText}</Text>
                    </View>
                )}

                {/* Spacer / Action */}
                <View style={{ flex: 1 }} />

                {onViewApplicants ? (
                    <TouchableOpacity 
                        onPress={onViewApplicants}
                        style={{ 
                            backgroundColor: '#EFF6FF', 
                            paddingHorizontal: 10, 
                            paddingVertical: 5, 
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#BFDBFE',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        <Ionicons name="people" size={12} color="#2563EB" />
                        <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '800' }}>
                            Applicants ({applicantsCount})
                        </Text>
                    </TouchableOpacity>
                ) : canShowAddress ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="home-outline" size={11} color="#94A3B8" />
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>{addressLabel}</Text>
                    </View>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}
