import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAuthStore } from '@/store/useAuthStore';
import { TweakApplication, useTweaksStore } from '@/store/useTweaksStore';

export default function ApplyStep1() {
    const { tweakId } = useLocalSearchParams();
    const router = useRouter();
    const { getTweakById } = useTweaksStore();
    const tweak = getTweakById(tweakId as string);

    const [message, setMessage] = useState('');

    const canContinue = message.trim().length >= 10;

    return (
        <ScreenWrapper>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 14,
                    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
                }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>Apply for Tweak</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Step indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 }}>
                    <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: '#007AFF' }} />
                    <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: '#E2E8F0' }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 4 }}>Step 1 / 2</Text>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Tweak category shown for context */}
                    {tweak && (
                        <View style={{
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            borderRadius: 12,
                            padding: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 24,
                        }}>
                            <Ionicons name="hammer-outline" size={16} color="#64748B" />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', textTransform: 'capitalize' }}>
                                {tweak.category}
                            </Text>
                        </View>
                    )}

                    {/* Question */}
                    <Text style={{ fontSize: 26, fontWeight: '900', color: '#0F172A', lineHeight: 34, marginBottom: 8 }}>
                        Why should they{'\n'}prefer you?
                    </Text>
                    <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20 }}>
                        Tell the lister why you're the best person for this job. Mention your experience, skills, and what makes you stand out.
                    </Text>

                    {/* Big Text Input */}
                    <View style={{
                        borderWidth: 1.5,
                        borderColor: message.length > 0 ? '#007AFF' : '#E2E8F0',
                        borderRadius: 16,
                        backgroundColor: '#FAFAFA',
                        padding: 16,
                        minHeight: 200,
                    }}>
                        <TextInput
                            value={message}
                            onChangeText={setMessage}
                            placeholder="e.g. I have 5 years of experience in painting, completed 20+ jobs in this area, and always deliver on time..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            textAlignVertical="top"
                            style={{
                                fontSize: 15,
                                color: '#0F172A',
                                lineHeight: 23,
                                minHeight: 160,
                            }}
                        />
                    </View>

                    {/* Character count */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, color: message.trim().length < 10 ? '#EF4444' : '#94A3B8' }}>
                            {message.trim().length < 10 ? `Minimum 10 characters (${10 - message.trim().length} more)` : ''}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#94A3B8' }}>{message.length} chars</Text>
                    </View>

                    {/* Tips */}
                    <View style={{
                        backgroundColor: '#EFF6FF',
                        borderRadius: 12,
                        padding: 14,
                        marginTop: 20,
                        gap: 8,
                    }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D4ED8', marginBottom: 4 }}>
                            💡 Tips for a strong pitch:
                        </Text>
                        {[
                            'Mention your relevant experience and skills',
                            'Share past success stories briefly',
                            'Highlight your availability and reliability',
                            'Be sincere and professional',
                        ].map((tip, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                                <Text style={{ color: '#3B82F6', fontSize: 13 }}>•</Text>
                                <Text style={{ color: '#1E40AF', fontSize: 13, flex: 1, lineHeight: 18 }}>{tip}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>

                {/* Bottom CTA */}
                <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <TouchableOpacity
                        onPress={() => {
                            if (!canContinue) return;
                            router.push({
                                pathname: `/apply/application/${tweakId}/step2` as any,
                                params: { whyMessage: message },
                            });
                        }}
                        disabled={!canContinue}
                        style={{
                            backgroundColor: canContinue ? '#007AFF' : '#CBD5E1',
                            paddingVertical: 16,
                            borderRadius: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        <Text style={{ fontWeight: '800', color: '#fff', fontSize: 16 }}>Next</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}
