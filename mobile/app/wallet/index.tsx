import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Toast } from '../../components/UI/ToastManager';
import RazorpayCheckout, { type CheckoutPrefill } from '../../components/Wallet/RazorpayCheckout';
import { useCreateTopupOrder, useVerifyTopup, useWallet, useWalletTransactions } from '../../hooks/useWallet';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMinor, toMinor } from '../../utils/money';
import type { RazorpaySuccess, TopupOrder, Transaction } from '../../types/api';
import { useTheme } from '@/themes/ThemeProvider';
import { themeColors } from '@/themes/colors';

// Mirrors the backend limits (WALLET_TOPUP_MIN/MAX_MINOR); the server is authoritative.
const MIN_TOPUP_RUPEES = 1;
const MAX_TOPUP_RUPEES = 100000;
const QUICK_AMOUNTS = [100, 500, 1000, 2000];

function transactionLabel(t: Transaction): string {
    if (t.type === 'payout') return t.amount_minor < 0 ? 'Withdrawal' : 'Withdrawal reversed';
    if (t.type === 'topup') return 'Money added';
    return t.type.charAt(0).toUpperCase() + t.type.slice(1);
}

export default function WalletPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const { data: wallet } = useWallet();
    const { data: transactions = [] } = useWalletTransactions();
    const createOrder = useCreateTopupOrder();
    const verify = useVerifyTopup();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [amountText, setAmountText] = useState('');
    const [order, setOrder] = useState<TopupOrder | null>(null);

    const walletBalanceMinor = wallet?.balance_minor ?? 0;
    const currency = wallet?.currency ?? 'INR';

    const amount = Number(amountText);
    const amountValid = Number.isFinite(amount) && amount >= MIN_TOPUP_RUPEES && amount <= MAX_TOPUP_RUPEES;
    const busy = createOrder.isPending || verify.isPending;

    const prefill = useMemo<CheckoutPrefill>(
        () => ({
            name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
            contact: user ? `${user.contactDetails.countryCode}${user.contactDetails.mobileNumber}` : undefined,
            email: user?.contactDetails.email || undefined,
        }),
        [user]
    );

    const startCheckout = (): void => {
        if (!amountValid || busy) return;
        createOrder.mutate(toMinor(amount), {
            onSuccess: (created) => {
                setSheetOpen(false);
                setOrder(created);
            },
        });
    };

    const handlePaid = (result: RazorpaySuccess): void => {
        setOrder(null);
        verify.mutate(result, {
            onSuccess: (res) => {
                setAmountText('');
                Toast.success(`${formatMinor(res.transaction.amount_minor, currency)} added to your wallet`);
            },
            onError: () => {
                // The Razorpay webhook still credits a captured payment server-side.
                Toast.info("Payment received. Your balance will update once it's confirmed.");
            },
        });
    };

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
                                <TouchableOpacity
                                    onPress={() => setSheetOpen(true)}
                                    disabled={busy}
                                    style={{ marginTop: 20, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Add money"
                                >
                                    {verify.isPending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Ionicons name="add-circle" size={18} color="#fff" />
                                    )}
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                                        {verify.isPending ? 'Confirming payment…' : 'Add money'}
                                    </Text>
                                </TouchableOpacity>
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
                    // The ledger is signed: positive credits the balance, negative debits it.
                    const sign = transaction.amount_minor > 0 ? '+' : transaction.amount_minor < 0 ? '-' : '';
                    const tone = transaction.amount_minor > 0 ? 'text-green-600' : transaction.amount_minor < 0 ? 'text-red-600' : 'text-gray-400';
                    return (
                        <View className="mx-6 bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-slate-700">
                            <View className="flex-row justify-between items-start">
                                <View className="flex-1">
                                    <Text className="font-semibold text-gray-900 dark:text-slate-50 mb-1">
                                        {transactionLabel(transaction)}
                                    </Text>
                                    <Text className="text-gray-500 dark:text-slate-400 text-sm">
                                        {new Date(transaction.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text className={`font-bold text-lg ${tone}`}>
                                    {sign}{formatMinor(Math.abs(transaction.amount_minor), currency)}
                                </Text>
                            </View>
                        </View>
                    );
                }}
            />

            {/* Add money sheet */}
            <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setSheetOpen(false)}>
                    <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 }}>Add money</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 }}>
                            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textSecondary, marginRight: 6 }}>₹</Text>
                            <TextInput
                                value={amountText}
                                onChangeText={(t) => setAmountText(t.replace(/[^0-9]/g, ''))}
                                placeholder="Enter amount"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoFocus
                                style={{ flex: 1, paddingVertical: 14, fontSize: 24, fontWeight: '800', color: colors.text }}
                                accessibilityLabel="Amount in rupees"
                            />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                            {QUICK_AMOUNTS.map((a) => (
                                <TouchableOpacity
                                    key={a}
                                    onPress={() => setAmountText(String(a))}
                                    style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: amountText === String(a) ? themeColors.primary : colors.border, backgroundColor: amountText === String(a) ? `${themeColors.primary}15` : colors.surfaceMuted }}
                                >
                                    <Text style={{ fontWeight: '700', color: amountText === String(a) ? themeColors.primary : colors.textSecondary }}>₹{a.toLocaleString()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {amountText.length > 0 && !amountValid && (
                            <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 10 }}>
                                Enter an amount between ₹{MIN_TOPUP_RUPEES} and ₹{MAX_TOPUP_RUPEES.toLocaleString()}.
                            </Text>
                        )}
                        <TouchableOpacity
                            onPress={startCheckout}
                            disabled={!amountValid || busy}
                            style={{ marginTop: 20, backgroundColor: themeColors.primary, opacity: !amountValid || busy ? 0.5 : 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            accessibilityRole="button"
                        >
                            {createOrder.isPending && <ActivityIndicator size="small" color="#fff" />}
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                                {amountValid ? `Pay ₹${amount.toLocaleString()}` : 'Pay'}
                            </Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
                            <Text style={{ fontSize: 12, color: colors.textMuted }}>UPI, cards and netbanking via Razorpay</Text>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {order && (
                <RazorpayCheckout
                    order={order}
                    prefill={prefill}
                    onSuccess={handlePaid}
                    onDismiss={() => setOrder(null)}
                />
            )}
        </ScreenWrapper>
    );
}
