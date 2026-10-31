import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
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
import { useTweak } from '@/hooks/useTweaks';
import { palette } from '@tweak/theme';
import { useTheme } from '@/themes/ThemeProvider';

export default function ApplyStep1(): React.JSX.Element {
    const { tweakId } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const { data: tweak } = useTweak(tweakId as string);

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
                    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
                }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel="Go back">
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Apply for Tweak</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Step indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }}>
                    <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: palette.iosBlue }} />
                    <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: colors.border }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginLeft: 4 }}>Step 1 / 2</Text>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Tweak category shown for context */}
                    {tweak && (
                        <View style={{
                            backgroundColor: colors.surfaceMuted,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 24,
                        }}>
                            <Ionicons name="hammer-outline" size={16} color={colors.textSecondary} />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' }}>
                                {tweak.category}
                            </Text>
                        </View>
                    )}

                    {/* Question */}
                    <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text, lineHeight: 34, marginBottom: 8 }}>
                        Why should they{'\n'}prefer you?
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20 }}>
                        Tell the lister why you're the best person for this job. Mention your experience, skills, and what makes you stand out.
                    </Text>

                    {/* Big Text Input */}
                    <View style={{
                        borderWidth: 1.5,
                        borderColor: message.length > 0 ? palette.iosBlue : colors.border,
                        borderRadius: 16,
                        backgroundColor: colors.surfaceMuted,
                        padding: 16,
                        minHeight: 200,
                    }}>
                        <TextInput
                            value={message}
                            onChangeText={setMessage}
                            placeholder="e.g. I have 5 years of experience in painting, completed 20+ jobs in this area, and always deliver on time..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            textAlignVertical="top"
                            style={{
                                fontSize: 15,
                                color: colors.text,
                                lineHeight: 23,
                                minHeight: 160,
                            }}
                        />
                    </View>

                    {/* Character count */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, color: message.trim().length < 10 ? palette.red500 : colors.textMuted }}>
                            {message.trim().length < 10 ? `Minimum 10 characters (${10 - message.trim().length} more)` : ''}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>{message.length} chars</Text>
                    </View>

                    {/* Tips */}
                    <View style={{
                        backgroundColor: palette.blue50,
                        borderRadius: 12,
                        padding: 14,
                        marginTop: 20,
                        gap: 8,
                    }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: palette.blue700, marginBottom: 4 }}>
                            💡 Tips for a strong pitch:
                        </Text>
                        {[
                            'Mention your relevant experience and skills',
                            'Share past success stories briefly',
                            'Highlight your availability and reliability',
                            'Be sincere and professional',
                        ].map((tip, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                                <Text style={{ color: palette.blue500, fontSize: 13 }}>•</Text>
                                <Text style={{ color: palette.blue800, fontSize: 13, flex: 1, lineHeight: 18 }}>{tip}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>

                {/* Bottom CTA */}
                <View style={{ padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <TouchableOpacity
                        onPress={() => {
                            if (!canContinue) return;
                            router.push({
                                pathname: `/apply/application/${tweakId}/step2`,
                                params: { whyMessage: message },
                            } as Href);
                        }}
                        disabled={!canContinue}
                        style={{
                            backgroundColor: canContinue ? palette.iosBlue : palette.slate300,
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
