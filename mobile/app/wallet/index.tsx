import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useWallet, useWalletTransactions } from '../../hooks/useWallet';
import { formatMinor } from '../../utils/money';
import type { Transaction } from '../../types/api';
import { useTheme } from '@/themes/ThemeProvider';

// Transaction types that add funds to the user's balance.
const CREDIT_TYPES: Transaction['type'][] = ['topup', 'release', 'refund', 'payout'];

export default function WalletPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();

    const { data: wallet } = useWallet();
    const { data: transactions = [] } = useWalletTransactions();
    const walletBalanceMinor = wallet?.balance_minor ?? 0;
    const currency = wallet?.currency ?? 'INR';

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
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">Wallet</Text>
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
                                    {formatMinor(walletBalanceMinor, currency)}
                                </Text>
                                {wallet != null && wallet.held_minor > 0 && (
                                    <Text className="text-white/70 text-sm mt-2">
                                        Held: {formatMinor(wallet.held_minor, currency)}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <View className="px-6">
                            <Text className="font-bold text-lg text-gray-900 dark:text-slate-50 mb-4">Transactions</Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <View className="bg-gray-100 dark:bg-slate-800 w-20 h-20 rounded-full items-center justify-center mb-4">
                            <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
                        </View>
                        <Text className="text-gray-400 dark:text-slate-400 font-medium">No transactions yet</Text>
                    </View>
                }
                renderItem={({ item: transaction }) => {
                    const isCredit = CREDIT_TYPES.includes(transaction.type);
                    return (
                        <View className="mx-6 bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-slate-700">
                            <View className="flex-row justify-between items-start">
                                <View className="flex-1">
                                    <Text className="font-semibold text-gray-900 dark:text-slate-50 mb-1 capitalize">
                                        {transaction.type}
                                    </Text>
                                    <Text className="text-gray-500 dark:text-slate-400 text-sm">
                                        {new Date(transaction.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text
                                    className={`font-bold text-lg ${
                                        isCredit ? 'text-green-600' : 'text-red-600'
                                    }`}
                                >
                                    {isCredit ? '+' : '-'}{formatMinor(Math.abs(transaction.amount_minor), currency)}
                                </Text>
                            </View>
                        </View>
                    );
                }}
            />
        </ScreenWrapper>
    );
}
