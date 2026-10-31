import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAuthStore } from '@/store/useAuthStore';
import type { Tweak } from '@/store/useTweaksStore';
import { useMyApplications, useTweak, useTweakApplicationsRaw, useUpdateTweak } from '@/hooks/useTweaks';
import { CHAT_STATUSES, useStartChat } from '@/hooks/useChat';
import { backendApplicationToLocal } from '@/utils/tweakAdapter';
import { minorToMajor } from '@/utils/money';
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from '@/hooks/useWatchlist';
import { ScheduleSlot } from '@/types/tweak';
import { palette } from '@tweak/theme';
import { useTheme } from '@/themes/ThemeProvider';

// ─── Conflict Detection Helpers ───────────────────────────────────────────────

function timeToMinutes(t: string): number {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function slotsOverlap(
    aDate: string, aStart: string, aEnd: string,
    bDate: string, bStart: string, bEnd: string
): boolean {
    if (aDate !== bDate) return false;
    const aS = timeToMinutes(aStart), aE = timeToMinutes(aEnd);
    const bS = timeToMinutes(bStart), bE = timeToMinutes(bEnd);
    return aS < bE && bS < aE;
}

type ConflictType = 'availability' | 'working_time' | null;

function getSlotConflict(
    slotDate: string,
    slotStart: string,
    slotEnd: string,
    appliedTweaks: Tweak[],
    currentTweakId: string,
): ConflictType {
    for (const applied of appliedTweaks) {
        if (applied.id === currentTweakId) continue;
        const sd = applied.scheduleData;
        if (!sd) continue;
        const slotType = sd.slotType as 'availability' | 'working_time' | undefined;

        // Check one_day
        if (applied.schedulePreference === 'one_day') {
            const date = sd.date ? new Date(sd.date).toISOString().split('T')[0] : '';
            const timeSlots: { start: string; end: string }[] = sd.timeSlots || [];
            for (const ts of timeSlots) {
                if (slotsOverlap(slotDate, slotStart, slotEnd, date, ts.start, ts.end)) {
                    return slotType || 'availability';
                }
            }
        }
        // Check few_days
        if (applied.schedulePreference === 'few_days') {
            const fewSlots: ScheduleSlot[] = sd.fewDaysSlots || [];
            for (const fs of fewSlots) {
                if (!fs.date) continue;
                const fsDate = new Date(fs.date).toISOString().split('T')[0];
                if (slotsOverlap(slotDate, slotStart, slotEnd, fsDate, fs.start, fs.end)) {
                    return slotType || 'availability';
                }
            }
        }
        // Check deadline
        if (applied.schedulePreference === 'deadline') {
            const deadlineSlots: ScheduleSlot[] = sd.deadlineSlots || [];
            for (const ds of deadlineSlots) {
                if (!ds.date) continue;
                const dsDate = new Date(ds.date).toISOString().split('T')[0];
                if (slotsOverlap(slotDate, slotStart, slotEnd, dsDate, ds.start, ds.end)) {
                    return slotType || 'availability';
                }
            }
        }
    }
    return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkillBadge({
    skill,
    matched,
}: {
    skill: string;
    matched: boolean;
}) {
    const { colors } = useTheme();
    const [showTip, setShowTip] = useState(false);

    return (
        <>
            <Pressable
                onPress={() => setShowTip(true)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: matched ? palette.green100 : colors.surfaceMuted,
                    borderColor: matched ? palette.green300 : colors.border,
                }}
            >
                {matched && (
                    <Ionicons name="checkmark-circle" size={13} color={palette.green600} />
                )}
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: matched ? palette.green600 : colors.textSecondary,
                    }}
                >
                    {skill}
                </Text>
            </Pressable>

            {/* Tooltip Modal */}
            <Modal transparent visible={showTip} animationType="fade" onRequestClose={() => setShowTip(false)}>
                <Pressable
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}
                    onPress={() => setShowTip(false)}
                >
                    <View style={{
                        backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginHorizontal: 32,
                        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Ionicons name={matched ? 'checkmark-circle' : 'information-circle'} size={20} color={matched ? palette.green600 : colors.textMuted} />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{skill}</Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                            {matched
                                ? 'This skill matches your profile! You have a higher chance of being selected.'
                                : "You don't have this skill listed on your profile. Consider adding it to improve your chances."}
                        </Text>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

function ConflictSlotBadge({
    label,
    conflict,
}: {
    label: string;
    conflict: ConflictType;
}) {
    const { colors } = useTheme();
    const [showTip, setShowTip] = useState(false);

    const bg = conflict === 'working_time' ? palette.red50 : conflict === 'availability' ? palette.orange50 : palette.blue50;
    const border = conflict === 'working_time' ? palette.red200 : conflict === 'availability' ? palette.orange200 : palette.blue200;
    const textColor = conflict === 'working_time' ? palette.red600 : conflict === 'availability' ? palette.orange600 : palette.blue700;
    const tipText = conflict === 'working_time'
        ? 'This slot conflicts with fixed working hours of another tweak you applied for.'
        : conflict === 'availability'
        ? 'This slot conflicts with the availability window of another tweak you applied for.'
        : '';

    return (
        <>
            <Pressable
                onPress={() => conflict ? setShowTip(true) : null}
                style={{
                    backgroundColor: bg,
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                }}
            >
                {conflict && (
                    <Ionicons
                        name="warning"
                        size={12}
                        color={textColor}
                    />
                )}
                <Text style={{ color: textColor, fontWeight: '600', fontSize: 13 }}>{label}</Text>
            </Pressable>

            <Modal transparent visible={showTip} animationType="fade" onRequestClose={() => setShowTip(false)}>
                <Pressable
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}
                    onPress={() => setShowTip(false)}
                >
                    <View style={{
                        backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginHorizontal: 32,
                        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Ionicons name="warning" size={20} color={textColor} />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Schedule Conflict</Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{tipText}</Text>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TweakDetails(): React.JSX.Element {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const { data: tweak } = useTweak(id as string);
    const { data: watchlist = [] } = useWatchlist();
    const addToWatchlist = useAddToWatchlist();
    const removeFromWatchlist = useRemoveFromWatchlist();
    const updateTweak = useUpdateTweak();
    const startChat = useStartChat();

    const userId = user?.id || '';

    // Chat: the lister talks to the accepted provider; the provider to the lister.
    const isOwner = Boolean(tweak && tweak.createdByUserId === userId);
    const { data: ownerApplications = [] } = useTweakApplicationsRaw(isOwner ? tweak?.id : undefined);
    const { data: myProviderApplications = [] } = useMyApplications();
    const chatApplicationId = isOwner
        ? ownerApplications.find((a) => CHAT_STATUSES.includes(a.status))?.id
        : myProviderApplications.find((a) => a.tweak_id === tweak?.id && CHAT_STATUSES.includes(a.status))?.id;

    // The provider's own (latest) application to this tweak. Non-owners can't list a
    // tweak's applications, so it comes from GET /tweaks/applications/mine.
    const myProviderApplication = isOwner
        ? undefined
        : myProviderApplications.find((a) => a.tweak_id === tweak?.id);

    // Slots the provider already committed to on other tweaks: accepted work is fixed
    // working time, pending applications are availability.
    const appliedTweaks = useMemo<Tweak[]>(
        () =>
            myProviderApplications
                .filter((a) => a.tweak_id !== tweak?.id && (a.status === 'pending' || a.status === 'accepted'))
                .map((a) => ({
                    id: a.tweak_id,
                    title: a.tweak_title,
                    description: '',
                    category: a.tweak_category,
                    images: [],
                    audioUri: null,
                    address: null,
                    skills: [],
                    languages: [],
                    schedulePreference: 'few_days',
                    scheduleData: {
                        slotType: a.status === 'accepted' ? 'working_time' : 'availability',
                        fewDaysSlots: a.selected_slots.map((s) => ({ date: s.date, start: s.start, end: s.end })),
                    },
                    pricingModel: '',
                    pricingData: null,
                    tweakType: '',
                    price: 0,
                    pricingType: '',
                    createdAt: a.applied_at,
                    status: 'active',
                    createdByUserId: '',
                })),
        [myProviderApplications, tweak?.id]
    );
    const userSkills = user?.skills ?? [];

    const [showFullDescription, setShowFullDescription] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showAppSummaryModal, setShowAppSummaryModal] = useState(false);

    // Audio Playback
    const player = useAudioPlayer(tweak?.audioUri || '');
    const playerStatus = useAudioPlayerStatus(player);
    const [isPlaying, setIsPlaying] = useState(false);

    const isWatchlisted = tweak ? watchlist.some((w) => w.id === tweak.id) : false;

    useEffect(() => {
        if (playerStatus.didJustFinish) {
            player.pause();
            setIsPlaying(false);
            player.seekTo(0);
        }
    }, [playerStatus.didJustFinish]);

    const togglePlayback = () => {
        if (playerStatus.playing) {
            player.pause();
            setIsPlaying(false);
        } else {
            player.play();
            setIsPlaying(true);
        }
    };

    const toggleWatchlist = () => {
        if (!tweak) return;
        if (isWatchlisted) {
            removeFromWatchlist.mutate(tweak.id);
        } else {
            addToWatchlist.mutate(tweak.id);
        }
    };

    if (!tweak) {
        return (
            <ScreenWrapper>
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
                    <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 mt-4">Tweak Not Found</Text>
                    <Text className="text-gray-500 dark:text-slate-400 text-center mt-2">
                        This tweak may have been removed or doesn't exist.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="bg-blue-600 px-8 py-3 rounded-xl mt-6"
                    >
                        <Text className="text-white font-bold">Go Back</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const truncateText = (text: string | undefined | null, maxLength: number) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const getTotalAmount = () => {
        if (tweak.pricingModel === 'quote') return '0';
        if (tweak.pricingModel === 'fixed' && tweak.pricingData) {
            return tweak.pricingData.price?.toString() || '0';
        } else if (tweak.pricingModel === 'quantity' && tweak.pricingData) {
            return tweak.pricingData.totalPrice?.toString() || '0';
        } else if (tweak.pricingModel === 'hourly' && tweak.pricingData) {
            return tweak.pricingData.price?.toString() || '0';
        }
        return '0';
    };

    const isOwnedByMe = tweak.createdByUserId === userId;
    const myApplication =
        tweak.applications?.find(a => a.userId === userId) ??
        (myProviderApplication
            ? {
                  ...backendApplicationToLocal(myProviderApplication),
                  listerQuotedPrice:
                      myProviderApplication.offer != null
                          ? minorToMajor(myProviderApplication.offer.lister_quoted_price_minor)
                          : undefined,
              }
            : undefined);
    const applicantsCount = tweak.applications?.length || 0;

    // ─── Conflict computation ─────────────────────────────────────────────────

    // Compute conflicts for all slots
    const getOneDaySlotConflicts = () => {
        if (!tweak.scheduleData?.timeSlots || !tweak.scheduleData?.date) return [];
        const date = new Date(tweak.scheduleData.date).toISOString().split('T')[0];
        return (tweak.scheduleData.timeSlots as { start: string; end: string }[]).map((slot) => ({
            slot,
            conflict: getSlotConflict(date, slot.start, slot.end, appliedTweaks, tweak.id),
        }));
    };

    const getFewDaysSlotConflicts = () => {
        const slots: ScheduleSlot[] =
            tweak.schedulePreference === 'few_days'
                ? tweak.scheduleData?.fewDaysSlots || []
                : tweak.scheduleData?.deadlineSlots || [];
        return slots.map((slot) => ({
            slot,
            conflict: getSlotConflict(
                new Date(slot.date ?? '').toISOString().split('T')[0],
                slot.start,
                slot.end,
                appliedTweaks,
                tweak.id
            ),
        }));
    };

    const oneDayConflicts = tweak.schedulePreference === 'one_day' ? getOneDaySlotConflicts() : [];
    const multiDayConflicts = (tweak.schedulePreference === 'few_days' || tweak.schedulePreference === 'deadline') ? getFewDaysSlotConflicts() : [];

    const allConflicted = (() => {
        if (tweak.schedulePreference === 'one_day') {
            return oneDayConflicts.length > 0 && oneDayConflicts.every((c) => c.conflict !== null);
        }
        if (tweak.schedulePreference === 'few_days' || tweak.schedulePreference === 'deadline') {
            return multiDayConflicts.length > 0 && multiDayConflicts.every((c) => c.conflict !== null);
        }
        return false;
    })();

    const hasAnyConflict = oneDayConflicts.some((c) => c.conflict) || multiDayConflicts.some((c) => c.conflict);

    return (
        <ScreenWrapper>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <View className="px-4 py-4 flex-row items-center justify-between bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2" accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">Tweak Details</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {/* Watchlist Button */}
                    {!isOwnedByMe && (
                        <TouchableOpacity
                            onPress={toggleWatchlist}
                            style={{ padding: 8, borderRadius: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                        >
                            <Ionicons
                                name={isWatchlisted ? 'bookmark' : 'bookmark-outline'}
                                size={22}
                                color={isWatchlisted ? palette.iosBlue : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    )}
                    {/* Three Dots Menu */}
                    <TouchableOpacity
                        onPress={() => setShowMenuModal(true)}
                        style={{ padding: 8, borderRadius: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel="More options"
                    >
                        <Ionicons name="ellipsis-vertical" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-white dark:bg-slate-900" contentContainerStyle={{ flexGrow: 1 }}>
                <View className="flex-1 p-5 pb-8">
                    {/* 1. Category as Title */}
                    <Text className="text-3xl font-bold text-gray-900 dark:text-slate-50 mb-4 capitalize">{tweak.category || 'General Task'}</Text>

                    {/* 2. Location (if in-person) */}
                    {tweak.tweakType === 'in_person' && tweak.address && (
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="location-sharp" size={18} color={palette.blue600} />
                            <Text className="text-gray-700 dark:text-slate-300 ml-1 text-base font-medium">{tweak.address.city}, {tweak.address.state}</Text>
                        </View>
                    )}

                    {/* 3. Type Tags */}
                    <View className="flex-row items-center mb-4">
                        <View className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                            <Text className="text-blue-700 font-bold text-[12px] uppercase tracking-wide">
                                {tweak.tweakType === 'remote' ? 'REMOTE' : 'ON-SITE'}
                            </Text>
                        </View>
                        <View className="ml-3 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                            <Text className="text-purple-700 font-bold text-[10px] uppercase">{tweak.category}</Text>
                        </View>
                    </View>

                    {/* ── Skill-Match Banner (Higher Chance) ────────────────── */}
                    {!isOwnedByMe && (
                        <View style={{
                            backgroundColor: palette.green50,
                            borderWidth: 1,
                            borderColor: palette.green300,
                            borderRadius: 14,
                            padding: 14,
                            marginBottom: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                        }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: palette.green100, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 18 }}>⭐</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: palette.green700, marginBottom: 2 }}>
                                    Higher Chance of Getting Selected!
                                </Text>
                                <Text style={{ fontSize: 12, color: palette.green800, lineHeight: 17 }}>
                                    Your rating for this job category is high. You're a great match!
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Price Display */}
                    <View style={{ backgroundColor: palette.indigo950 }} className="rounded-2xl p-5 mb-6 w-full flex-row items-center justify-between shadow-sm">
                        <View className="flex-1">
                            <Text className="text-white text-xs font-medium opacity-70 mb-1 uppercase tracking-wider">
                                Total Price
                            </Text>
                            {tweak.pricingModel === 'quantity' && tweak.pricingData && (
                                <Text className="text-white text-[11px] font-semibold opacity-90">
                                    ₹{tweak.pricingData.pricePerItem} per {tweak.pricingData.itemName || 'unit'}
                                </Text>
                            )}
                            {tweak.pricingModel === 'hourly' && tweak.pricingData && (
                                <Text className="text-white text-[11px] font-semibold opacity-90">
                                    Rate: ₹{tweak.pricingData.price}/hr
                                </Text>
                            )}
                            {tweak.pricingModel === 'fixed' && (
                                <Text className="text-white text-[11px] font-semibold opacity-90">FIXED RATE</Text>
                            )}
                            {tweak.pricingModel === 'quote' && (
                                <Text className="text-white text-[11px] font-semibold opacity-90">APPLICANT TO QUOTE</Text>
                            )}
                        </View>
                        <Text className="text-white text-3xl font-bold">
                            {tweak.pricingModel === 'quote' ? '—' : `₹${getTotalAmount()}`}
                        </Text>
                    </View>

                    {/* 4. Schedule & Availability Slots */}
                    {tweak.scheduleData && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 dark:text-slate-50 mb-3">Schedule & Availability</Text>

                            {(tweak.schedulePreference === 'few_days' || tweak.schedulePreference === 'deadline') ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        {multiDayConflicts.map(({ slot, conflict }, index) => {
                                            const slotDate = new Date(slot.date ?? '');
                                            const dayName = slotDate.toLocaleDateString('en-US', { weekday: 'short' });
                                            const day = slotDate.getDate();
                                            const month = slotDate.toLocaleDateString('en-US', { month: 'short' });
                                            const bg = conflict === 'working_time' ? palette.red50 : conflict === 'availability' ? palette.orange50 : colors.surface;
                                            const border = conflict === 'working_time' ? palette.red200 : conflict === 'availability' ? palette.orange200 : colors.border;

                                            return (
                                                <View key={index} style={{ backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 14, padding: 12, minWidth: 90, alignItems: 'center' }}>
                                                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>{dayName}</Text>
                                                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 }}>{day} {month}</Text>
                                                    <ConflictSlotBadge
                                                        label={`${slot.start} - ${slot.end}`}
                                                        conflict={conflict}
                                                    />
                                                </View>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            ) : tweak.schedulePreference === 'one_day' && tweak.scheduleData.date ? (
                                <View>
                                    <View className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex-row items-center gap-3 mb-4">
                                        <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center">
                                            <Ionicons name="calendar-outline" size={24} color={palette.blue600} />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">Date</Text>
                                            <Text className="text-base font-bold text-gray-900 dark:text-slate-50">{formatDate(new Date(tweak.scheduleData.date))}</Text>
                                        </View>
                                    </View>

                                    {oneDayConflicts.length > 0 && (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {oneDayConflicts.map(({ slot, conflict }, index) => (
                                                <ConflictSlotBadge
                                                    key={index}
                                                    label={`${slot.start} - ${slot.end}`}
                                                    conflict={conflict}
                                                />
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ) : null}

                            {/* Conflict warning message */}
                            {hasAnyConflict && !isOwnedByMe && (
                                <View style={{
                                    backgroundColor: palette.orange50,
                                    borderWidth: 1,
                                    borderColor: palette.orange200,
                                    borderRadius: 12,
                                    padding: 12,
                                    marginTop: 10,
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                }}>
                                    <Ionicons name="warning" size={16} color={palette.orange600} style={{ marginTop: 1 }} />
                                    <Text style={{ fontSize: 13, color: palette.orange700, flex: 1, lineHeight: 18, fontWeight: '500' }}>
                                        {allConflicted
                                            ? 'All available slots conflict with your existing applications. You cannot apply to this tweak.'
                                            : 'Some slots conflict with tweaks you have already applied for. Tap a highlighted slot to see details.'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* 6. Description */}
                    {tweak.description && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 dark:text-slate-50 mb-3">About the Job</Text>
                            <Text className="text-gray-600 dark:text-slate-300 text-base leading-6">
                                {showFullDescription ? tweak.description : truncateText(tweak.description, 200)}
                            </Text>
                            {tweak.description.length > 200 && (
                                <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)} className="mt-2">
                                    <Text className="text-blue-600 font-semibold">{showFullDescription ? 'Show Less' : 'Read More'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* 7. Voice Instructions */}
                    {tweak.audioUri && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 dark:text-slate-50 mb-3">Voice Instructions</Text>
                            <View className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full p-2 pr-6 flex-row items-center shadow-sm">
                                <TouchableOpacity
                                    onPress={togglePlayback}
                                    className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full items-center justify-center mr-4"
                                    accessibilityRole="button"
                                    accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
                                >
                                    <FontAwesome5 name={isPlaying ? 'pause' : 'play'} size={14} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <Text className="text-sm font-bold text-gray-900 dark:text-slate-50 mr-4">
                                    {formatDuration(isPlaying ? playerStatus.currentTime : playerStatus.duration)}
                                </Text>
                                <View className="flex-1 h-8 justify-center gap-1 flex-row items-center opacity-40">
                                    {Array.from({ length: 15 }).map((_, i) => (
                                        <View key={i} className={`w-1 rounded-full ${i % 2 === 0 ? 'h-4 bg-gray-400' : 'h-6 bg-gray-600'}`} />
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* 8. Photos */}
                    {tweak.images && tweak.images.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 dark:text-slate-50 mb-3">Photos</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                                {tweak.images.map((img: { uri: string }, index: number) => (
                                    <View key={index} className="mr-3 shadow-md shadow-gray-200">
                                        <Image
                                            source={{ uri: img.uri }}
                                            className="w-32 h-32 rounded-xl bg-gray-100 dark:bg-slate-800"
                                            resizeMode="cover"
                                        />
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* 9. Skills Required — with match highlighting */}
                    {tweak.skills && tweak.skills.length > 0 && (
                        <View className="mb-6">
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <Text className="text-base font-bold text-gray-900 dark:text-slate-50">Skills Required</Text>
                                {!isOwnedByMe && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name="checkmark-circle" size={12} color={palette.green600} />
                                        <Text style={{ fontSize: 11, color: palette.green600, fontWeight: '600' }}>= matches your profile</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {tweak.skills.map((skill: string, index: number) => {
                                    // Randomized matching for demo purposes as requested
                                    const isRandomMatch = (index + tweak.id.length) % 2 === 0;
                                    const matched = !isOwnedByMe && (userSkills.map(s => s.toLowerCase()).includes(skill.toLowerCase()) || isRandomMatch);
                                    return (
                                        <SkillBadge key={index} skill={skill} matched={matched} />
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* 10. Languages */}
                    {tweak.languages && tweak.languages.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 dark:text-slate-50 mb-3">Languages</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {tweak.languages.map((lang: string, index: number) => (
                                    <View key={index} className="bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700">
                                        <Text className="text-gray-700 dark:text-slate-300 font-medium">{lang}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── Action Buttons ─────────────────────────────────────── */}
                    <View className="mt-auto pt-6 border-t border-gray-100 dark:border-slate-700">
                        {chatApplicationId && (
                            <TouchableOpacity
                                onPress={() => startChat.start(chatApplicationId)}
                                disabled={startChat.isPending}
                                style={{
                                    backgroundColor: palette.iosBlue,
                                    paddingVertical: 14,
                                    borderRadius: 14,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    marginBottom: 10,
                                    opacity: startChat.isPending ? 0.7 : 1,
                                }}
                                accessibilityRole="button"
                            >
                                <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
                                <Text style={{ fontWeight: '800', color: '#fff', fontSize: 15 }}>
                                    {isOwnedByMe ? 'Message Provider' : 'Message Lister'}
                                </Text>
                            </TouchableOpacity>
                        )}
                        {isOwnedByMe ? (
                            <View style={{ gap: 10 }}>
                                {/* View Applicants Button */}
                                <TouchableOpacity
                                    onPress={() => router.push(`/tweaks/${tweak.id}/applicants` as Href)}
                                    style={{
                                        backgroundColor: palette.blue50,
                                        borderWidth: 1,
                                        borderColor: palette.blue200,
                                        paddingVertical: 14,
                                        borderRadius: 14,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <Ionicons name="people-outline" size={20} color={palette.blue600} />
                                    <Text style={{ fontWeight: '700', color: palette.blue600, fontSize: 15 }}>
                                        View Applicants{applicantsCount > 0 ? ` (${applicantsCount})` : ''}
                                    </Text>
                                </TouchableOpacity>
                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        onPress={() => router.push('/create-tweak/edit')}
                                        className="flex-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 py-4 rounded-xl flex-row items-center justify-center gap-2"
                                    >
                                        <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                                        <Text className="font-bold text-gray-700 dark:text-slate-300">Edit Tweak</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            Alert.alert('Close Tweak', 'Close this tweak? It will no longer accept applications.', [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Close',
                                                    style: 'destructive',
                                                    onPress: () => updateTweak.mutate({ id: tweak.id, data: { status: 'closed' } }),
                                                },
                                            ]);
                                        }}
                                        disabled={updateTweak.isPending}
                                        className="flex-1 bg-gray-900 py-4 rounded-xl flex-row items-center justify-center"
                                    >
                                        <Text className="font-bold text-white">Close Tweak</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : myApplication ? (
                            <TouchableOpacity
                                onPress={() => setShowAppSummaryModal(true)}
                                style={{
                                    backgroundColor: palette.sky50,
                                    borderWidth: 1,
                                    borderColor: palette.blue200,
                                    paddingVertical: 16,
                                    borderRadius: 14,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                            >
                                <Ionicons name="document-text-outline" size={20} color={palette.iosBlue} />
                                <Text style={{ fontWeight: '800', color: palette.iosBlue, fontSize: 16 }}>
                                    View Application
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={() => {
                                    if (allConflicted) return;
                                    router.push(`/apply/application/${tweak.id}/step1` as Href);
                                }}
                                disabled={allConflicted}
                                style={{
                                    backgroundColor: allConflicted ? palette.slate400 : palette.iosBlue,
                                    paddingVertical: 16,
                                    borderRadius: 14,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    opacity: allConflicted ? 0.7 : 1,
                                }}
                            >
                                <Text style={{ fontWeight: '800', color: '#fff', fontSize: 16 }}>
                                    {allConflicted ? 'Cannot Apply — All Slots Conflict' : 'Apply Now'}
                                </Text>
                                {!allConflicted && <Ionicons name="arrow-forward" size={18} color="white" />}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* ── Three-Dots Menu Modal ───────────────────────────────────── */}
            <Modal visible={showMenuModal} transparent animationType="fade" onRequestClose={() => setShowMenuModal(false)}>
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
                    onPress={() => setShowMenuModal(false)}
                >
                    <View style={{
                        position: 'absolute',
                        top: 70,
                        right: 16,
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        shadowColor: '#000',
                        shadowOpacity: 0.15,
                        shadowRadius: 16,
                        elevation: 12,
                        overflow: 'hidden',
                        minWidth: 180,
                    }}>
                        <TouchableOpacity
                            onPress={() => {
                                setShowMenuModal(false);
                                Alert.alert('Report', 'Thank you for your report. We will review this tweak.');
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
                        >
                            <Ionicons name="flag-outline" size={18} color={palette.red500} />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: palette.red500 }}>Report</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                setShowMenuModal(false);
                                Alert.alert('Support', 'Our support team will contact you shortly.');
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}
                        >
                            <Ionicons name="help-circle-outline" size={18} color={colors.textSecondary} />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>Support</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
            {/* ── Application Summary Modal ─────────────────────────────── */}
            <Modal visible={showAppSummaryModal} transparent animationType="slide" onRequestClose={() => setShowAppSummaryModal(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '60%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Your Application</Text>
                            <TouchableOpacity onPress={() => setShowAppSummaryModal(false)} accessibilityRole="button" accessibilityLabel="Close">
                                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Status Badge */}
                            <View style={{ 
                                backgroundColor: myApplication?.status === 'accepted' ? palette.green100 : myApplication?.status === 'rejected' ? palette.red100 : palette.blue50,
                                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 20,
                                flexDirection: 'row', alignItems: 'center', gap: 6
                            }}>
                                <Ionicons 
                                    name={myApplication?.status === 'accepted' ? 'checkmark-circle' : myApplication?.status === 'rejected' ? 'close-circle' : 'time'} 
                                    size={16} 
                                    color={myApplication?.status === 'accepted' ? palette.green700 : myApplication?.status === 'rejected' ? palette.red700 : palette.blue700} 
                                />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: myApplication?.status === 'accepted' ? palette.green700 : myApplication?.status === 'rejected' ? palette.red700 : palette.blue700, textTransform: 'uppercase' }}>
                                    {myApplication?.status || 'PENDING'}
                                </Text>
                            </View>

                            {/* Pitch */}
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Your Pitch</Text>
                            <View style={{ backgroundColor: colors.surfaceMuted, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}>
                                <Text style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 22 }}>
                                    {myApplication?.whyPreferMessage}
                                </Text>
                            </View>

                            {/* Quote */}
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Your Quote</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <View style={{ backgroundColor: colors.surfaceMuted, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>₹{myApplication?.quotedPrice || tweak.price}</Text>
                                </View>
                                {myApplication?.listerQuotedPrice && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                                        <View style={{ backgroundColor: palette.orange50, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: palette.orange200 }}>
                                            <Text style={{ fontSize: 16, fontWeight: '800', color: palette.orange600 }}>Counter: ₹{myApplication.listerQuotedPrice}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Slots */}
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Selected Slots</Text>
                            <View style={{ gap: 8, marginBottom: 30 }}>
                                {myApplication?.selectedSlots.map((slot, i) => (
                                    <View key={i} style={{ backgroundColor: colors.surfaceMuted, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                                        <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '600' }}>
                                            {new Date(slot.date ?? '').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}: {slot.start} - {slot.end}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setShowAppSummaryModal(false)}
                            style={{ backgroundColor: palette.slate900, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
}
