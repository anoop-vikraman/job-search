import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

import { ScreenWrapper } from '../../components/ScreenWrapper';

interface WalletTransaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
}

export default function WalletPage(): React.JSX.Element {
    const router = useRouter();

    // Populated from GET /api/v1/wallet/transactions once the backend exists.
    const transactions: WalletTransaction[] = [];
    const walletBalance = 0;

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
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Wallet</Text>
            </View>

            <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 24 }}
                ListHeaderComponent={
                    <View>
                        {/* Balance Card */}
                        <View className="px-6 py-6">
                            <View className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-8 shadow-lg">
                                <Text className="text-white/80 text-sm mb-2">Total Balance</Text>
                                <Text className="text-white font-bold text-5xl">
                                    ₹{walletBalance.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                        <View className="px-6">
                            <Text className="font-bold text-lg text-gray-900 mb-4">Transactions</Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <View className="bg-gray-100 w-20 h-20 rounded-full items-center justify-center mb-4">
                            <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
                        </View>
                        <Text className="text-gray-400 font-medium">No transactions yet</Text>
                    </View>
                }
                renderItem={({ item: transaction }) => (
                    <View className="mx-6 bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
                        <View className="flex-row justify-between items-start">
                            <View className="flex-1">
                                <Text className="font-semibold text-gray-900 mb-1">
                                    {transaction.description}
                                </Text>
                                <Text className="text-gray-500 text-sm">{transaction.date}</Text>
                            </View>
                            <Text
                                className={`font-bold text-lg ${
                                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                                {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount)}
                            </Text>
                        </View>
                    </View>
                )}
            />
        </ScreenWrapper>
    );
}
