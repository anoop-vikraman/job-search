import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { describeSavedSearch, useDeleteSavedSearch, useSavedSearches } from '@/hooks/useSavedSearches';
import { useTheme } from '@/themes/ThemeProvider';

export default function SavedSearchAlertsPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { data: alerts = [], isLoading } = useSavedSearches();
    const remove = useDeleteSavedSearch();

    return (
        <ScreenWrapper>
            <View className="flex-row items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">Saved Search Alerts</Text>
            </View>
            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={colors.textMuted} />
            ) : (
                <FlatList
                    data={alerts}
                    keyExtractor={(a) => a.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 120, flexGrow: 1 }}
                    ListHeaderComponent={
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                            We notify you when a new tweak matches one of these. Save a search from the Find Tweaks screen (bell icon).
                        </Text>
                    }
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>No alerts yet.</Text>
                    }
                    renderItem={({ item }) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
                            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{item.name}</Text>
                                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{describeSavedSearch(item)}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => remove.mutate(item.id)}
                                disabled={remove.isPending}
                                style={{ padding: 6 }}
                                accessibilityRole="button"
                                accessibilityLabel={`Delete alert ${item.name}`}
                            >
                                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </ScreenWrapper>
    );
}
