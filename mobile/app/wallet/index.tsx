import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';

const transactions: { id: string; date: string; description: string; amount: number; type: 'credit' | 'debit' }[] = [];
const walletBalance = 0;

export default function WalletPage() {
    const router = useRouter();

    return (
        <ScreenWrapper>
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Wallet</Text>
            </View>

            <ScrollView className="flex-1">
                {/* Balance Card */}
                <View className="px-6 py-6">
                    <View className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-8 shadow-lg">
                        <Text className="text-white/80 text-sm mb-2">Total Balance</Text>
                        <Text className="text-white font-bold text-5xl">₹{walletBalance.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Transactions */}
                <View className="px-6 pb-6">
                    <Text className="font-bold text-lg text-gray-900 mb-4">Transactions</Text>
                    {transactions.map((transaction) => (
                        <View key={transaction.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
                            <View className="flex-row justify-between items-start">
                                <View className="flex-1">
                                    <Text className="font-semibold text-gray-900 mb-1">{transaction.description}</Text>
                                    <Text className="text-gray-500 text-sm">{transaction.date}</Text>
                                </View>
                                <Text className={`font-bold text-lg ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}
