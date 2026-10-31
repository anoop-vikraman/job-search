import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useNotificationPreferences, useSetPushPreference } from '../../hooks/useNotifications';
import { useTheme } from '@/themes/ThemeProvider';
import { themeColors } from '@/themes/colors';

// User-facing groups; any type the backend adds later still appears under "Other".
const LABELS: Record<string, { label: string; hint: string }> = {
    new_message: { label: 'Chat messages', hint: 'New messages from listers and providers' },
    application_received: { label: 'New applications', hint: 'Someone applied to your tweak' },
    application_accepted: { label: 'Application accepted', hint: 'A lister picked you' },
    application_rejected: { label: 'Application declined', hint: 'A lister chose someone else' },
    counter_offer: { label: 'Counter-offers', hint: 'A lister proposed a different price' },
    tweak_completed: { label: 'Job completion & payouts', hint: 'Work completed and payment released' },
    refund_processed: { label: 'Refunds', hint: 'Refund decisions' },
    wallet_topup: { label: 'Wallet top-ups', hint: 'Money added to your wallet' },
    saved_search_match: { label: 'Saved search alerts', hint: 'New tweaks matching your alerts' },
    system: { label: 'Account & system', hint: 'Withdrawals, verification and other updates' },
};

export default function NotificationSettingsPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { data, isLoading } = useNotificationPreferences();
    const setPref = useSetPushPreference();
    const types = Object.keys(data?.push ?? {}).sort(
        (a, b) => (LABELS[a] ? 0 : 1) - (LABELS[b] ? 0 : 1) || a.localeCompare(b)
    );

    return (
        <ScreenWrapper>
            <View className="flex-row items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">Notification Settings</Text>
            </View>
            {isLoading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={colors.textMuted} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                        Choose which push notifications you receive. Everything still appears in your Alerts tab.
                    </Text>
                    {types.map((type) => {
                        const meta = LABELS[type] ?? { label: type.replace(/_/g, ' '), hint: '' };
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
                                    accessibilityLabel={`${meta.label} push notifications`}
                                />
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </ScreenWrapper>
    );
}
