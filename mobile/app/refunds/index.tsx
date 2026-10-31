import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useRefunds } from '../../hooks/useRefunds';
import { formatMinor } from '../../utils/money';
import type { RefundStatus } from '../../types/api';
import { palette } from '@tweak/theme';

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
            return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
};

export default function RefundsPage(): React.JSX.Element {
    const router = useRouter();

    const { data: refunds = [] } = useRefunds();

    return (
        <ScreenWrapper>
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mr-4"
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={24} color={palette.gray900} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">My Refunds</Text>
            </View>

            <FlatList
                data={refunds}
                keyExtractor={(item) => item.id}
                className="flex-1 px-6 py-6"
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <View className="bg-gray-100 w-20 h-20 rounded-full items-center justify-center mb-4">
                            <Ionicons name="receipt-outline" size={40} color={palette.gray500} />
                        </View>
                        <Text className="font-bold text-gray-900 text-lg mb-2">No refunds yet</Text>
                        <Text className="text-gray-500 text-center">
                            Your refund requests will appear here
                        </Text>
                    </View>
                }
                renderItem={({ item: refund }) => {
                    const colors = getStatusColor(refund.status);
                    return (
                        <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
                            <View className="flex-row justify-between items-start mb-3">
                                <Text className="font-bold text-gray-900 flex-1">
                                    {refund.reason || `Refund ${refund.id.slice(0, 8)}`}
                                </Text>
                                <View className={`px-3 py-1 rounded-full ${colors.bg}`}>
                                    <Text className={`text-xs font-semibold ${colors.text} capitalize`}>
                                        {refund.status}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-500 text-sm">
                                    {new Date(refund.created_at).toLocaleDateString()}
                                </Text>
                                <Text className="font-bold text-gray-900 text-lg">
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
