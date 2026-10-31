import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';

const refunds: { id: string; tweakName: string; amount: number; status: 'Pending' | 'Approved' | 'Rejected'; dateRequested: string }[] = [];

export default function RefundsPage() {
    const router = useRouter();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return { bg: 'bg-green-100', text: 'text-green-700' };
            case 'Pending': return { bg: 'bg-orange-100', text: 'text-orange-700' };
            case 'Rejected': return { bg: 'bg-red-100', text: 'text-red-700' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
        }
    };

    return (
        <ScreenWrapper>
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">My Refunds</Text>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
                {refunds.length === 0 ? (
                    <View className="items-center py-16">
                        <View className="bg-gray-100 w-20 h-20 rounded-full items-center justify-center mb-4">
                            <Ionicons name="receipt-outline" size={40} color="#6B7280" />
                        </View>
                        <Text className="font-bold text-gray-900 text-lg mb-2">No refunds yet</Text>
                        <Text className="text-gray-500 text-center">Your refund requests will appear here</Text>
                    </View>
                ) : (
                    refunds.map((refund) => {
                        const colors = getStatusColor(refund.status);
                        return (
                            <View key={refund.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
                                <View className="flex-row justify-between items-start mb-3">
                                    <Text className="font-bold text-gray-900 flex-1">{refund.tweakName}</Text>
                                    <View className={`px-3 py-1 rounded-full ${colors.bg}`}>
                                        <Text className={`text-xs font-semibold ${colors.text}`}>{refund.status}</Text>
                                    </View>
                                </View>
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-gray-500 text-sm">{refund.dateRequested}</Text>
                                    <Text className="font-bold text-gray-900 text-lg">₹{refund.amount}</Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}
