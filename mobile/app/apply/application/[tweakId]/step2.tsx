import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAuthStore } from '@/store/useAuthStore';
import { Tweak, TweakApplication, useTweaksStore } from '@/store/useTweaksStore';
import { ScheduleSlot } from '@/types/tweak';

// ─── Conflict Detection (same logic as details page) ─────────────────────────

function timeToMinutes(t: string): number {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function slotsOverlap(aDate: string, aStart: string, aEnd: string, bDate: string, bStart: string, bEnd: string): boolean {
    if (aDate !== bDate) return false;
    const aS = timeToMinutes(aStart), aE = timeToMinutes(aEnd);
    const bS = timeToMinutes(bStart), bE = timeToMinutes(bEnd);
    return aS < bE && bS < aE;
}

type ConflictType = 'availability' | 'working_time' | null;

type TimeSlotShape = ScheduleSlot;
type AppliedTweakShape = Tweak;

interface BuiltSlot {
    key: string;
    label: string;
    dateLabel: string;
    slotData: { date: string; start: string; end: string };
    conflict: ConflictType;
}

function getSlotConflict(
    slotDate: string, slotStart: string, slotEnd: string,
    appliedTweaks: AppliedTweakShape[], currentTweakId: string,
): ConflictType {
    for (const applied of appliedTweaks) {
        if (applied.id === currentTweakId) continue;
        const sd = applied.scheduleData;
        if (!sd) continue;
        const slotType = sd.slotType as 'availability' | 'working_time' | undefined;

        if (applied.schedulePreference === 'one_day') {
            const date = sd.date ? new Date(sd.date).toISOString().split('T')[0] : '';
            for (const ts of (sd.timeSlots || [])) {
                if (slotsOverlap(slotDate, slotStart, slotEnd, date, ts.start, ts.end)) return slotType || 'availability';
            }
        }
        if (applied.schedulePreference === 'few_days') {
            for (const fs of (sd.fewDaysSlots || [])) {
                if (!fs.date) continue;
                if (slotsOverlap(slotDate, slotStart, slotEnd, new Date(fs.date).toISOString().split('T')[0], fs.start, fs.end)) return slotType || 'availability';
            }
        }
        if (applied.schedulePreference === 'deadline') {
            for (const ds of (sd.deadlineSlots || [])) {
                if (!ds.date) continue;
                if (slotsOverlap(slotDate, slotStart, slotEnd, new Date(ds.date).toISOString().split('T')[0], ds.start, ds.end)) return slotType || 'availability';
            }
        }
    }
    return null;
}

// ─── Slot Item ────────────────────────────────────────────────────────────────

function SlotItem({
    label,
    dateLabel,
    conflict,
    selected,
    onPress,
    onConflictInfo,
}: {
    label: string;
    dateLabel?: string;
    conflict: ConflictType;
    selected: boolean;
    onPress: () => void;
    onConflictInfo: () => void;
}) {
    const conflictBg = conflict === 'working_time' ? '#FEF2F2' : '#FFF7ED';
    const conflictBorder = conflict === 'working_time' ? '#FECACA' : '#FED7AA';
    const conflictText = conflict === 'working_time' ? '#DC2626' : '#EA580C';

    const bg = conflict ? conflictBg : selected ? '#DCFCE7' : '#F8FAFC';
    const border = conflict ? conflictBorder : selected ? '#86EFAC' : '#E2E8F0';
    const textColor = conflict ? conflictText : selected ? '#15803D' : '#475569';

    return (
        <Pressable
            onPress={conflict ? onConflictInfo : onPress}
            style={{
                backgroundColor: bg,
                borderWidth: 1.5,
                borderColor: border,
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {conflict ? (
                    <Ionicons name="warning" size={16} color={conflictText} />
                ) : selected ? (
                    <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                ) : (
                    <Ionicons name="time-outline" size={16} color="#94A3B8" />
                )}
                <View>
                    {dateLabel && <Text style={{ fontSize: 11, color: textColor, fontWeight: '600', marginBottom: 1, opacity: 0.7 }}>{dateLabel}</Text>}
                    <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>{label}</Text>
                </View>
            </View>
            {conflict && (
                <TouchableOpacity onPress={onConflictInfo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Conflict details">
                    <Ionicons name="information-circle-outline" size={18} color={conflictText} />
                </TouchableOpacity>
            )}
        </Pressable>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApplyStep2() {
    const { tweakId, whyMessage } = useLocalSearchParams<{ tweakId: string; whyMessage: string }>();
    const router = useRouter();
    const { getTweakById, getAppliedTweaks, addApplication } = useTweaksStore();
    const { user } = useAuthStore();

    const tweak = getTweakById(tweakId);
    const userId = user?.id || '';
    const appliedTweaks = getAppliedTweaks(userId);

    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [quotedPrice, setQuotedPrice] = useState('');
    const [conflictTip, setConflictTip] = useState<{ visible: boolean; type: ConflictType }>({ visible: false, type: null });
    const [applying, setApplying] = useState(false);

    if (!tweak) {
        return (
            <ScreenWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#64748B' }}>Tweak not found.</Text>
                </View>
            </ScreenWrapper>
        );
    }

    // Build slot list with conflicts
    const buildSlots = () => {
        const sd = tweak.scheduleData;
        if (!sd) return [];

        if (tweak.schedulePreference === 'one_day') {
            const date = sd.date ? new Date(sd.date).toISOString().split('T')[0] : '';
            const dateLabel = sd.date ? new Date(sd.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
            return (sd.timeSlots || []).map((ts: TimeSlotShape, i: number) => ({
                key: `one_${i}`,
                label: `${ts.start} – ${ts.end}`,
                dateLabel,
                slotData: { date, start: ts.start, end: ts.end },
                conflict: getSlotConflict(date, ts.start, ts.end, appliedTweaks, tweakId),
            }));
        }

        if (tweak.schedulePreference === 'few_days') {
            return (sd.fewDaysSlots || []).map((fs: TimeSlotShape, i: number) => {
                const d = new Date(fs.date ?? '').toISOString().split('T')[0];
                const dateLabel = new Date(fs.date ?? '').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                return {
                    key: `few_${i}`,
                    label: `${fs.start} – ${fs.end}`,
                    dateLabel,
                    slotData: { date: d, start: fs.start, end: fs.end },
                    conflict: getSlotConflict(d, fs.start, fs.end, appliedTweaks, tweakId),
                };
            });
        }

        if (tweak.schedulePreference === 'deadline') {
            return (sd.deadlineSlots || []).map((ds: TimeSlotShape, i: number) => {
                const d = new Date(ds.date ?? '').toISOString().split('T')[0];
                const dateLabel = new Date(ds.date ?? '').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                return {
                    key: `dead_${i}`,
                    label: `${ds.start} – ${ds.end}`,
                    dateLabel,
                    slotData: { date: d, start: ds.start, end: ds.end },
                    conflict: getSlotConflict(d, ds.start, ds.end, appliedTweaks, tweakId),
                };
            });
        }

        return [];
    };

    const slots = buildSlots();

    const toggleSlot = (key: string) => {
        setSelectedSlots(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const isQuoteModel = tweak.pricingModel === 'quote';
    const canApply = selectedSlots.length > 0 && (!isQuoteModel || quotedPrice.trim().length > 0);

    const handleApply = () => {
        if (!canApply || applying) return;
        setApplying(true);

        const chosenSlots = slots.filter((s: BuiltSlot) => selectedSlots.includes(s.key)).map((s: BuiltSlot) => s.slotData);
        const application: TweakApplication = {
            userId,
            userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            profilePictureUrl: user?.profilePictureUrl,
            userSkills: user?.skills || ['Painting', 'Plumbing', 'Cleaning'],
            completedCategories: user?.completedCategories || ['Cleaning'],
            whyPreferMessage: whyMessage || '',
            quotedPrice: quotedPrice ? parseFloat(quotedPrice) : undefined,
            selectedSlots: chosenSlots,
            appliedAt: new Date().toISOString(),
            status: 'pending',
        };

        addApplication(tweakId, application);
        setApplying(false);
        Alert.alert(
            'Application Sent! 🎉',
            'Your application has been submitted successfully. The lister will review and get back to you.',
            [{
                text: 'View My Applications',
                onPress: () => router.replace('/apply'),
            }]
        );
    };

    return (
        <ScreenWrapper>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 14,
                    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
                }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="Go back">
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>Apply for Tweak</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Step indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 }}>
                    <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: '#007AFF' }} />
                    <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: '#007AFF' }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 4 }}>Step 2 / 2</Text>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

                    {/* Slot selection */}
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 6 }}>
                        Choose Your Preferred Slots
                    </Text>
                    <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 16, lineHeight: 20 }}>
                        Select the time slots you're available for. Tap a conflicting slot (orange/red) for details.
                    </Text>

                    {slots.length === 0 ? (
                        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 24 }}>
                            <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
                            <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center' }}>No specific time slots defined for this tweak.</Text>
                        </View>
                    ) : (
                        <View style={{ marginBottom: 24 }}>
                            {slots.map((s: BuiltSlot) => (
                                <SlotItem
                                    key={s.key}
                                    label={s.label}
                                    dateLabel={s.dateLabel}
                                    conflict={s.conflict}
                                    selected={selectedSlots.includes(s.key)}
                                    onPress={() => toggleSlot(s.key)}
                                    onConflictInfo={() => setConflictTip({ visible: true, type: s.conflict })}
                                />
                            ))}
                            {selectedSlots.length === 0 && (
                                <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                                    * Please select at least one slot
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Price Quote */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                            {isQuoteModel ? 'Your Quoted Price *' : 'Counter Quote (Optional)'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
                            {isQuoteModel
                                ? 'This tweak requires you to set a price. Enter your best quote.'
                                : `The listed price is ₹${tweak.pricingModel !== 'quote' ? (tweak.pricingData?.price || tweak.price || '—') : '—'}. You can suggest a different price.`}
                        </Text>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            borderWidth: 1.5, borderColor: quotedPrice ? '#007AFF' : '#E2E8F0',
                            borderRadius: 14, backgroundColor: '#FAFAFA', paddingHorizontal: 16,
                        }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A', marginRight: 8 }}>₹</Text>
                            <TextInput
                                value={quotedPrice}
                                onChangeText={(t) => setQuotedPrice(t.replace(/[^0-9.]/g, ''))}
                                placeholder="0.00"
                                placeholderTextColor="#94A3B8"
                                keyboardType="decimal-pad"
                                style={{ flex: 1, fontSize: 18, fontWeight: '600', color: '#0F172A', paddingVertical: 14 }}
                            />
                        </View>
                    </View>

                    {/* Summary of step 1 message */}
                    <View style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 16,
                    }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Your Pitch (Step 1)
                        </Text>
                        <Text style={{ fontSize: 14, color: '#334155', lineHeight: 20 }} numberOfLines={3}>
                            {whyMessage || '—'}
                        </Text>
                    </View>
                </ScrollView>

                {/* Bottom CTA */}
                <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <TouchableOpacity
                        onPress={handleApply}
                        disabled={!canApply || applying}
                        style={{
                            backgroundColor: canApply ? '#007AFF' : '#CBD5E1',
                            paddingVertical: 16,
                            borderRadius: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        <Ionicons name="send-outline" size={18} color="#fff" />
                        <Text style={{ fontWeight: '800', color: '#fff', fontSize: 16 }}>
                            {applying ? 'Submitting...' : 'Submit Application'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Conflict Tooltip Modal */}
            <Modal transparent visible={conflictTip.visible} animationType="fade" onRequestClose={() => setConflictTip({ visible: false, type: null })}>
                <Pressable
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}
                    onPress={() => setConflictTip({ visible: false, type: null })}
                >
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 16, padding: 20, marginHorizontal: 32,
                        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Ionicons name="warning" size={20} color={conflictTip.type === 'working_time' ? '#DC2626' : '#EA580C'} />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Schedule Conflict</Text>
                        </View>
                        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                            {conflictTip.type === 'working_time'
                                ? 'This slot conflicts with fixed working hours of another tweak you already applied for. Consider deselecting it.'
                                : 'This slot overlaps with the availability window of another tweak you applied for. You may still select it, but conflicts can reduce acceptance chances.'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setConflictTip({ visible: false, type: null })}
                            style={{ marginTop: 16, backgroundColor: '#007AFF', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </ScreenWrapper>
    );
}
