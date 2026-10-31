import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTweaksStore } from '@/store/useTweaksStore';

export default function ApplicantDetail() {
    const { id, userId } = useLocalSearchParams();
    const router = useRouter();
    const { getTweakById, updateApplicationStatus, updateListerCounterQuote } = useTweaksStore();
    const tweak = getTweakById(id as string);
    const applicant = tweak?.applications?.find(a => a.userId === userId);

    const [counterQuote, setCounterQuote] = useState(applicant?.listerQuotedPrice?.toString() || '');

    if (!tweak || !applicant) {
        return (
            <ScreenWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#64748B' }}>Applicant not found.</Text>
                </View>
            </ScreenWrapper>
        );
    }

    const hasCompletedCategory = applicant.completedCategories?.includes(tweak.category);

    const handleAction = (status: 'accepted' | 'rejected') => {
        const actionLabel = status === 'accepted' ? 'Accept' : 'Reject';
        Alert.alert(
            `${actionLabel} Applicant`,
            `Are you sure you want to ${status} ${applicant.userName}'s application?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: actionLabel,
                    style: status === 'rejected' ? 'destructive' : 'default',
                    onPress: () => {
                        updateApplicationStatus(tweak.id, applicant.userId, status);
                        if (counterQuote) {
                            updateListerCounterQuote(tweak.id, applicant.userId, parseFloat(counterQuote));
                        }
                        Alert.alert('Success', `Application ${status}ed successfully.`);
                        router.back();
                    }
                }
            ]
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
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>Applicant Profile</Text>
                    <View style={{ width: 36 }} />
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
                    {/* Hero Section */}
                    <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#fff' }}>
                        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                            {applicant.profilePictureUrl ? (
                                <Image source={{ uri: applicant.profilePictureUrl }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                            ) : (
                                <Text style={{ fontSize: 40, fontWeight: '700', color: '#64748B' }}>{applicant.userName.charAt(0)}</Text>
                            )}
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>{applicant.userName}</Text>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                            <Ionicons name="star" size={16} color="#F59E0B" />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#444' }}>4.8</Text>
                            <Text style={{ fontSize: 14, color: '#94A3B8' }}>(24 reviews)</Text>
                        </View>

                        {hasCompletedCategory && (
                            <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="ribbon-outline" size={14} color="#1E40AF" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF' }}>
                                    Completed jobs in {tweak.category} before
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Content Section */}
                    <View style={{ padding: 20 }}>
                        {/* Skills */}
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>Skills</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                            {applicant.userSkills.map((skill, idx) => (
                                <View key={idx} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>{skill}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Why prefer me */}
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>Why they applied</Text>
                        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 }}>
                            <Text style={{ fontSize: 15, lineHeight: 24, color: '#334155' }}>
                                {applicant.whyPreferMessage || "No message provided."}
                            </Text>
                        </View>

                        {/* Selected Slots */}
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>Preferred Slots</Text>
                        <View style={{ gap: 8, marginBottom: 24 }}>
                            {applicant.selectedSlots.map((slot, idx) => {
                                const d = new Date(slot.date ?? '').toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                return (
                                    <View key={idx} style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="calendar-outline" size={16} color="#2563EB" />
                                        <Text style={{ fontSize: 14, color: '#1E40AF', fontWeight: '600' }}>{d}: {slot.start} - {slot.end}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Pricing */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <View>
                                    <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>Applicant's Quote</Text>
                                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A' }}>₹{applicant.quotedPrice || tweak.price}</Text>
                                </View>
                                <Ionicons name="cash-outline" size={32} color="#10B981" />
                            </View>

                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>Counter Quote (Optional)</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12 }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: '#64748B', marginRight: 8 }}>₹</Text>
                                <TextInput
                                    style={{ flex: 1, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: '#0F172A' }}
                                    placeholder="Propose a different price"
                                    keyboardType="numeric"
                                    value={counterQuote}
                                    onChangeText={setCounterQuote}
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Footer Actions */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                        onPress={() => handleAction('rejected')}
                        style={{ flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center' }}
                    >
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#B91C1C' }}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleAction('accepted')}
                        style={{ flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: '#007AFF', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Accept Applicant</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}
