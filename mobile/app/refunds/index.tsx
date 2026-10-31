import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useRefunds } from '../../hooks/useRefunds';
import { formatMinor } from '../../utils/money';
import type { RefundStatus } from '../../types/api';
import { useTheme } from '@/themes/ThemeProvider';

const getStatusColor = (status: RefundStatus): { bg: string; text: string } => {
    switch (status) {
        case 'approved':
        case 'processed':
            return { bg: 'bg-green-100', text: 'text-green-700' };
        case 'requested':
            return { bg: 'bg-orange-100', text: 'text-orange-700' };
        case 'rejected':
            return { bg: 'bg-red-100', text: 'text-red-700' };
        default:
            return { bg: 'bg-gray-100 dark:bg-slate-800', text: 'text-gray-700 dark:text-slate-300' };
    }
};

export default function RefundsPage(): React.JSX.Element {
    const router = useRouter();
    const { colors: theme } = useTheme();

    const { data: refunds = [] } = useRefunds();

    return (
        <ScreenWrapper>
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mr-4"
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">My Refunds</Text>
            </View>

            <FlatList
                data={refunds}
                keyExtractor={(item) => item.id}
                className="flex-1 px-6 py-6"
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <View className="bg-gray-100 dark:bg-slate-800 w-20 h-20 rounded-full items-center justify-center mb-4">
                            <Ionicons name="receipt-outline" size={40} color={theme.textSecondary} />
                        </View>
                        <Text className="font-bold text-gray-900 dark:text-slate-50 text-lg mb-2">No refunds yet</Text>
                        <Text className="text-gray-500 dark:text-slate-400 text-center">
                            Your refund requests will appear here
                        </Text>
                    </View>
                }
                renderItem={({ item: refund }) => {
                    const colors = getStatusColor(refund.status);
                    return (
                        <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-slate-700">
                            <View className="flex-row justify-between items-start mb-3">
                                <Text className="font-bold text-gray-900 dark:text-slate-50 flex-1">
                                    {refund.reason || `Refund ${refund.id.slice(0, 8)}`}
                                </Text>
                                <View className={`px-3 py-1 rounded-full ${colors.bg}`}>
                                    <Text className={`text-xs font-semibold ${colors.text} capitalize`}>
                                        {refund.status}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-500 dark:text-slate-400 text-sm">
                                    {new Date(refund.created_at).toLocaleDateString()}
                                </Text>
                                <Text className="font-bold text-gray-900 dark:text-slate-50 text-lg">
                                    {formatMinor(refund.amount_minor)}
                                </Text>
                            </View>
                        </View>
                    );
                }}
            />
        </ScreenWrapper>
    );
}
