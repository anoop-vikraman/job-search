import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useApplicationAction, useTweak, useTweakApplicationsRaw } from '@/hooks/useTweaks';
import { formatMinor, toMinor } from '@/utils/money';
import { palette } from '@tweak/theme';

export default function ApplicantDetail(): React.JSX.Element {
    // Route param `userId` now carries the backend application id.
    const { id, userId: applicationId } = useLocalSearchParams<{ id: string; userId: string }>();
    const router = useRouter();
    const { data: tweak } = useTweak(id);
    const { data: applicants = [] } = useTweakApplicationsRaw(id);
    const applicant = applicants.find((a) => a.id === applicationId);
    const action = useApplicationAction();

    const [counterQuote, setCounterQuote] = useState('');

    if (!tweak || !applicant) {
        return (
            <ScreenWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: palette.slate500 }}>Applicant not found.</Text>
                </View>
            </ScreenWrapper>
        );
    }

    const displayName = applicant.provider_user_id.slice(0, 8);
    const isAccepted = applicant.status === 'accepted';
    const isPending = applicant.status === 'pending';

    const runAction = (
        label: string,
        confirmText: string,
        act: Parameters<typeof action.mutate>[0]['action'],
        destructive = false
    ): void => {
        Alert.alert(
            label,
            confirmText,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: label,
                    style: destructive ? 'destructive' : 'default',
                    onPress: () => {
                        action.mutate(
                            { applicationId: applicant.id, tweakId: tweak.id, action: act },
                            {
                                onSuccess: () => {
                                    Alert.alert('Success', `Application updated successfully.`);
                                    router.back();
                                },
                            }
                        );
                    },
                },
            ]
        );
    };

    const handleAccept = (): void =>
        runAction('Accept', `Accept ${displayName}'s application?`, { type: 'accept' });
    const handleReject = (): void =>
        runAction('Reject', `Reject ${displayName}'s application?`, { type: 'reject' }, true);
    const handleCounter = (): void => {
        const parsed = parseFloat(counterQuote);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            Alert.alert('Invalid amount', 'Enter a valid counter quote first.');
            return;
        }
        runAction('Counter', `Send a counter quote of ₹${parsed}?`, {
            type: 'counter',
            listerQuotedPriceMinor: toMinor(parsed),
        });
    };
    const handleComplete = (): void =>
        runAction('Complete', 'Mark this application as completed?', { type: 'complete' });
    const handleCancel = (): void =>
        runAction('Cancel', 'Cancel this accepted application?', { type: 'cancel' }, true);

    return (
        <ScreenWrapper>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 14,
                    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: palette.slate100,
                }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="Go back">
                        <Ionicons name="arrow-back" size={24} color={palette.gray900} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: palette.slate900 }}>Applicant Profile</Text>
                    <View style={{ width: 36 }} />
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
                    {/* Hero Section */}
                    <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#fff' }}>
                        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: palette.slate100, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                            <Text style={{ fontSize: 40, fontWeight: '700', color: palette.slate500 }}>{displayName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: palette.slate900 }}>{displayName}</Text>

                        <View style={{ backgroundColor: palette.blue100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="ribbon-outline" size={14} color={palette.blue800} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: palette.blue800, textTransform: 'uppercase' }}>
                                {applicant.status}
                            </Text>
                        </View>
                    </View>

                    {/* Content Section */}
                    <View style={{ padding: 20 }}>
                        {/* Why prefer me */}
                        <Text style={{ fontSize: 16, fontWeight: '800', color: palette.slate900, marginBottom: 12 }}>Why they applied</Text>
                        <View style={{ backgroundColor: palette.slate50, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: palette.slate200, marginBottom: 24 }}>
                            <Text style={{ fontSize: 15, lineHeight: 24, color: palette.slate700 }}>
                                {applicant.why_prefer_message || "No message provided."}
                            </Text>
                        </View>

                        {/* Selected Slots */}
                        <Text style={{ fontSize: 16, fontWeight: '800', color: palette.slate900, marginBottom: 12 }}>Preferred Slots</Text>
                        <View style={{ gap: 8, marginBottom: 24 }}>
                            {applicant.selected_slots.map((slot, idx) => {
                                const d = new Date(slot.date ?? '').toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                return (
                                    <View key={idx} style={{ backgroundColor: palette.blue50, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="calendar-outline" size={16} color={palette.blue600} />
                                        <Text style={{ fontSize: 14, color: palette.blue800, fontWeight: '600' }}>{d}: {slot.start} - {slot.end}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Pricing */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: palette.slate200, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <View>
                                    <Text style={{ fontSize: 13, color: palette.slate500, marginBottom: 4 }}>Applicant's Quote</Text>
                                    <Text style={{ fontSize: 24, fontWeight: '900', color: palette.slate900 }}>
                                        {applicant.quoted_price_minor != null
                                            ? formatMinor(applicant.quoted_price_minor)
                                            : `₹${tweak.price}`}
                                    </Text>
                                </View>
                                <Ionicons name="cash-outline" size={32} color={palette.green600} />
                            </View>

                            <Text style={{ fontSize: 14, fontWeight: '700', color: palette.slate900, marginBottom: 8 }}>Counter Quote (Optional)</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.slate50, borderRadius: 12, borderWidth: 1, borderColor: palette.slate200, paddingHorizontal: 12 }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: palette.slate500, marginRight: 8 }}>₹</Text>
                                <TextInput
                                    style={{ flex: 1, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: palette.slate900 }}
                                    placeholder="Propose a different price"
                                    keyboardType="numeric"
                                    value={counterQuote}
                                    onChangeText={setCounterQuote}
                                />
                                <TouchableOpacity
                                    onPress={handleCounter}
                                    disabled={action.isPending}
                                    style={{ backgroundColor: palette.orange50, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: palette.orange200 }}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: palette.orange600 }}>Counter</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Footer Actions */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: palette.slate100, flexDirection: 'row', gap: 12 }}>
                    {isPending ? (
                        <>
                            <TouchableOpacity
                                onPress={handleReject}
                                disabled={action.isPending}
                                style={{ flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: palette.red100, alignItems: 'center' }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '800', color: palette.red700 }}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAccept}
                                disabled={action.isPending}
                                style={{ flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: palette.iosBlue, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Accept Applicant</Text>
                            </TouchableOpacity>
                        </>
                    ) : isAccepted ? (
                        <>
                            <TouchableOpacity
                                onPress={handleCancel}
                                disabled={action.isPending}
                                style={{ flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: palette.red100, alignItems: 'center' }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '800', color: palette.red700 }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleComplete}
                                disabled={action.isPending}
                                style={{ flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: palette.green600, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            >
                                <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Mark Completed</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: palette.slate500, textTransform: 'capitalize' }}>
                                Application {applicant.status}
                            </Text>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}
