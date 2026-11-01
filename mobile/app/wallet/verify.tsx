import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Toast } from '@/components/UI/ToastManager';
import { useKycStatus, useSubmitKyc } from '@/hooks/useWallet';
import { useTheme } from '@/themes/ThemeProvider';
import { themeColors } from '@/themes/colors';
import type { KycIdType } from '@/types/api';

// Labels in locales: verify.idTypes.*
const ID_TYPES: KycIdType[] = ['aadhaar', 'pan', 'driving_licence', 'passport', 'voter_id'];
const UPI_RE = /^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9]{1,63}$/;
const MAX_DOCS = 3;

interface LocalDoc {
    uri: string;
    name: string;
    type: string;
}

export default function VerifyIdentityPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { data: kyc, isLoading } = useKycStatus();
    const submit = useSubmitKyc();

    const [fullName, setFullName] = useState('');
    const [idType, setIdType] = useState<KycIdType>('aadhaar');
    const [idNumber, setIdNumber] = useState('');
    const [upiId, setUpiId] = useState('');
    const [docs, setDocs] = useState<LocalDoc[]>([]);

    const cleanId = idNumber.replace(/[\s-]/g, '');
    const valid =
        fullName.trim().length >= 2 && /^[A-Za-z0-9]{6,20}$/.test(cleanId) && UPI_RE.test(upiId.trim()) && docs.length > 0;

    const addDoc = async (): Promise<void> => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Toast.error(t('verify.photoPermission'));
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (result.canceled || result.assets.length === 0) return;
        const a = result.assets[0];
        setDocs((prev) => [...prev, { uri: a.uri, name: a.fileName ?? `id-${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' }].slice(0, MAX_DOCS));
    };

    const onSubmit = (): void => {
        if (!valid) return;
        submit.mutate(
            { fullName: fullName.trim(), idType, idNumber: cleanId, upiId: upiId.trim(), documents: docs },
            { onSuccess: () => Toast.success(t('verify.submitted')) }
        );
    };

    const header = (
        <View className="flex-row items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
            <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel={t('common.goBack')}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">{t('verify.title')}</Text>
        </View>
    );

    if (isLoading) {
        return (
            <ScreenWrapper>
                {header}
                <ActivityIndicator style={{ marginTop: 40 }} color={colors.textMuted} />
            </ScreenWrapper>
        );
    }

    const latest = kyc?.latest;
    if (kyc?.verified || latest?.status === 'pending') {
        const verified = Boolean(kyc?.verified);
        return (
            <ScreenWrapper>
                {header}
                <View style={{ alignItems: 'center', padding: 32 }}>
                    <Ionicons name={verified ? 'shield-checkmark' : 'time-outline'} size={56} color={verified ? '#16A34A' : '#D97706'} />
                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12 }}>
                        {verified ? t('verify.verifiedTitle') : t('verify.reviewTitle')}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
                        {verified
                            ? t('verify.verifiedBody', { upi: latest?.upi_id ?? t('verify.verifiedUpiFallback') })
                            : t('verify.reviewBody', {
                                  idType: latest?.id_type ? t(`verify.idTypes.${latest.id_type}`) : t('verify.idFallback'),
                                  last4: latest?.id_number_last4 ?? '',
                              })}
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    const input = { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceMuted } as const;
    const label = { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, marginTop: 16 } as const;

    return (
        <ScreenWrapper>
            {header}
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
                {latest?.status === 'rejected' && (
                    <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                        <Text style={{ color: '#991B1B', fontWeight: '700' }}>{t('verify.rejectedTitle')}</Text>
                        <Text style={{ color: '#991B1B', marginTop: 2 }}>{latest.rejection_reason}</Text>
                    </View>
                )}
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    {t('verify.intro')}
                </Text>

                <Text style={label}>{t('verify.fullName')}</Text>
                <TextInput value={fullName} onChangeText={setFullName} style={input} placeholder={t('verify.fullNamePlaceholder')} placeholderTextColor={colors.textMuted} />

                <Text style={label}>{t('verify.idType')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {ID_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => setIdType(type)}
                            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: idType === type ? themeColors.primary : colors.border, backgroundColor: idType === type ? `${themeColors.primary}15` : colors.surfaceMuted }}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: idType === type }}
                        >
                            <Text style={{ fontWeight: '600', color: idType === type ? themeColors.primary : colors.textSecondary }}>{t(`verify.idTypes.${type}`)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={label}>{t('verify.idNumber')}</Text>
                <TextInput value={idNumber} onChangeText={setIdNumber} style={input} autoCapitalize="characters" placeholder={t('verify.idNumberPlaceholder')} placeholderTextColor={colors.textMuted} />

                <Text style={label}>{t('verify.upi')}</Text>
                <TextInput value={upiId} onChangeText={setUpiId} style={input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="name@bank" placeholderTextColor={colors.textMuted} />
                {upiId.length > 0 && !UPI_RE.test(upiId.trim()) && (
                    <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{t('verify.upiInvalid')}</Text>
                )}

                <Text style={label}>{t('verify.docs')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {docs.map((d) => (
                        <View key={d.uri}>
                            <Image source={{ uri: d.uri }} style={{ width: 96, height: 64, borderRadius: 8 }} />
                            <TouchableOpacity onPress={() => setDocs((prev) => prev.filter((x) => x.uri !== d.uri))} style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 11 }} accessibilityLabel={t('verify.removeDoc')}>
                                <Ionicons name="close-circle" size={22} color="#DC2626" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {docs.length < MAX_DOCS && (
                        <TouchableOpacity onPress={addDoc} style={{ width: 96, height: 64, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={t('verify.addDoc')}>
                            <Ionicons name="add" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    onPress={onSubmit}
                    disabled={!valid || submit.isPending}
                    style={{ marginTop: 28, backgroundColor: themeColors.primary, opacity: !valid || submit.isPending ? 0.5 : 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    accessibilityRole="button"
                >
                    {submit.isPending && <ActivityIndicator size="small" color="#fff" />}
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('verify.submit')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </ScreenWrapper>
    );
}
