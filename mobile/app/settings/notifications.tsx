import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useNotificationPreferences, useSetPushPreference } from '../../hooks/useNotifications';
import { useTheme } from '@/themes/ThemeProvider';
import { themeColors } from '@/themes/colors';

// User-facing groups (labels in locales: notificationSettings.types.*);
// any type the backend adds later still appears with its raw name.
const KNOWN_TYPES = new Set([
    'new_message',
    'application_received',
    'application_accepted',
    'application_rejected',
    'counter_offer',
    'tweak_completed',
    'refund_processed',
    'wallet_topup',
    'saved_search_match',
    'system',
]);

export default function NotificationSettingsPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { data, isLoading } = useNotificationPreferences();
    const setPref = useSetPushPreference();
    const types = Object.keys(data?.push ?? {}).sort(
        (a, b) => (KNOWN_TYPES.has(a) ? 0 : 1) - (KNOWN_TYPES.has(b) ? 0 : 1) || a.localeCompare(b)
    );

    return (
        <ScreenWrapper>
            <View className="flex-row items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel={t('common.goBack')}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">{t('notificationSettings.title')}</Text>
            </View>
            {isLoading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={colors.textMuted} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                        {t('notificationSettings.intro')}
                    </Text>
                    {types.map((type) => {
                        const meta = KNOWN_TYPES.has(type)
                            ? { label: t(`notificationSettings.types.${type}.label`), hint: t(`notificationSettings.types.${type}.hint`) }
                            : { label: type.replace(/_/g, ' '), hint: '' };
                        const enabled = data?.push[type] ?? true;
                        return (
                            <View key={type} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>{meta.label}</Text>
                                    {meta.hint ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{meta.hint}</Text> : null}
                                </View>
                                <Switch
                                    value={enabled}
                                    onValueChange={(next) => setPref.mutate({ type, enabled: next })}
                                    trackColor={{ true: themeColors.primary, false: colors.border }}
                                    accessibilityLabel={t('notificationSettings.switchLabel', { label: meta.label })}
                                />
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </ScreenWrapper>
    );
}
