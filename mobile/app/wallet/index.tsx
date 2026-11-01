import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Toast } from '../../components/UI/ToastManager';
import RazorpayCheckout, { type CheckoutPrefill } from '../../components/Wallet/RazorpayCheckout';
import {
    useCreateTopupOrder,
    useKycStatus,
    usePayouts,
    useRequestPayout,
    useVerifyTopup,
    useWallet,
    useWalletTransactions,
} from '../../hooks/useWallet';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMinor, toMinor } from '../../utils/money';
import { track } from '../../utils/analytics';
import type { Payout, RazorpaySuccess, TopupOrder, Transaction } from '../../types/api';
import { useTheme } from '@/themes/ThemeProvider';
import { themeColors } from '@/themes/colors';

// Mirrors the backend limits (WALLET_TOPUP_MIN/MAX_MINOR); the server is authoritative.
const MIN_TOPUP_RUPEES = 1;
const MAX_TOPUP_RUPEES = 100000;
const QUICK_AMOUNTS = [100, 500, 1000, 2000];
const MIN_WITHDRAW_RUPEES = 100; // backend PAYOUT_MIN_MINOR

// Labels in locales: wallet.payoutStatus.*
const PAYOUT_STATUS_COLOR: Record<Payout['status'], string> = {
    requested: '#D97706',
    paid: '#16A34A',
    rejected: '#DC2626',
};

function transactionLabel(tx: Transaction, t: TFunction): string {
    if (tx.type === 'payout') return tx.amount_minor < 0 ? t('wallet.tx.withdrawal') : t('wallet.tx.withdrawalReversed');
    return t(`wallet.tx.${tx.type}`);
}

export default function WalletPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { data: wallet } = useWallet();
    const { data: transactions = [] } = useWalletTransactions();
    const createOrder = useCreateTopupOrder();
    const verify = useVerifyTopup();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [amountText, setAmountText] = useState('');
    const [order, setOrder] = useState<TopupOrder | null>(null);
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [withdrawText, setWithdrawText] = useState('');
    const { data: kyc } = useKycStatus();
    const { data: payouts = [] } = usePayouts();
    const requestPayout = useRequestPayout();

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
                track('checkout_opened', { amount_minor: created.amount_minor });
            },
        });
    };

    const withdrawAmount = Number(withdrawText);
    const withdrawValid =
        Number.isFinite(withdrawAmount) &&
        withdrawAmount >= MIN_WITHDRAW_RUPEES &&
        toMinor(withdrawAmount) <= walletBalanceMinor;

    const submitWithdraw = (): void => {
        if (!withdrawValid) return;
        requestPayout.mutate(toMinor(withdrawAmount), {
            onSuccess: (p) => {
                setWithdrawOpen(false);
                setWithdrawText('');
                Toast.success(t('wallet.payoutSent', { amount: formatMinor(p.amount_minor, currency), upi: p.upi_id }));
            },
        });
    };

    const handlePaid = (result: RazorpaySuccess): void => {
        setOrder(null);
        verify.mutate(result, {
            onSuccess: (res) => {
                setAmountText('');
                Toast.success(t('wallet.topupDone', { amount: formatMinor(res.transaction.amount_minor, currency) }));
            },
            onError: () => {
                // The Razorpay webhook still credits a captured payment server-side.
                Toast.info(t('wallet.topupPending'));
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
                    accessibilityLabel={t('common.goBack')}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">{t('wallet.title')}</Text>
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
                                <Text className="text-white/80 text-sm mb-2">{t('wallet.totalBalance')}</Text>
                                <Text className="text-white font-bold text-5xl">
                                    {formatMinor(walletBalanceMinor, currency)}
                                </Text>
                                {wallet != null && wallet.held_minor > 0 && (
                                    <Text className="text-white/70 text-sm mt-2">
                                        {t('wallet.held', { amount: formatMinor(wallet.held_minor, currency) })}
                                    </Text>
                                )}
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                                <TouchableOpacity
                                    onPress={() => setSheetOpen(true)}
                                    disabled={busy}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('wallet.addMoney')}
                                >
                                    {verify.isPending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Ionicons name="add-circle" size={18} color="#fff" />
                                    )}
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                                        {verify.isPending ? t('wallet.confirming') : t('wallet.addMoney')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setWithdrawOpen(true)}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('wallet.withdraw')}
                                >
                                    <Ionicons name="arrow-up-circle" size={18} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{t('wallet.withdraw')}</Text>
                                </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {payouts.length > 0 && (
                            <View className="px-6 mb-4">
                                <Text className="font-bold text-lg text-gray-900 dark:text-slate-50 mb-3">{t('wallet.withdrawals')}</Text>
                                {payouts.slice(0, 5).map((p) => (
                                    <View key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-2 border border-gray-100 dark:border-slate-700 flex-row justify-between items-center">
                                        <View style={{ flex: 1 }}>
                                            <Text className="font-semibold text-gray-900 dark:text-slate-50">{formatMinor(p.amount_minor, currency)} → {p.upi_id}</Text>
                                            <Text className="text-gray-500 dark:text-slate-400 text-xs mt-1">
                                                {new Date(p.created_at).toLocaleDateString()}
                                                {p.reference ? ` · ${t('wallet.ref', { ref: p.reference })}` : ''}
                                                {p.failure_reason ? ` · ${p.failure_reason}` : ''}
                                            </Text>
                                        </View>
                                        <Text style={{ color: PAYOUT_STATUS_COLOR[p.status], fontWeight: '800', fontSize: 12 }}>{t(`wallet.payoutStatus.${p.status}`)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <View className="px-6">
                            <Text className="font-bold text-lg text-gray-900 dark:text-slate-50 mb-4">{t('wallet.transactions')}</Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <View className="bg-gray-100 dark:bg-slate-800 w-20 h-20 rounded-full items-center justify-center mb-4">
                            <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
                        </View>
                        <Text className="text-gray-400 dark:text-slate-400 font-medium">{t('wallet.noTransactions')}</Text>
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
                                        {transactionLabel(transaction, t)}
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
                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 }}>{t('wallet.addMoney')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 }}>
                            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textSecondary, marginRight: 6 }}>₹</Text>
                            <TextInput
                                value={amountText}
                                onChangeText={(t) => setAmountText(t.replace(/[^0-9]/g, ''))}
                                placeholder={t('wallet.enterAmount')}
                                placeholderTextColor={colors.textMuted}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoFocus
                                style={{ flex: 1, paddingVertical: 14, fontSize: 24, fontWeight: '800', color: colors.text }}
                                accessibilityLabel={t('wallet.amountLabel')}
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
                                {t('wallet.amountRange', { min: MIN_TOPUP_RUPEES, max: MAX_TOPUP_RUPEES.toLocaleString() })}
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
                                {amountValid ? t('wallet.payAmount', { amount: amount.toLocaleString() }) : t('wallet.pay')}
                            </Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
                            <Text style={{ fontSize: 12, color: colors.textMuted }}>{t('wallet.via')}</Text>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Withdraw sheet */}
            <Modal visible={withdrawOpen} transparent animationType="slide" onRequestClose={() => setWithdrawOpen(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setWithdrawOpen(false)}>
                    <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 }}>{t('wallet.withdraw')}</Text>
                        {!kyc?.verified ? (
                            <>
                                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                                    {kyc?.latest?.status === 'pending'
                                        ? t('wallet.kycPending')
                                        : t('wallet.kycNeeded')}
                                </Text>
                                {kyc?.latest?.status !== 'pending' && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setWithdrawOpen(false);
                                            router.push('/wallet/verify');
                                        }}
                                        style={{ marginTop: 16, backgroundColor: themeColors.primary, paddingVertical: 15, borderRadius: 14, alignItems: 'center' }}
                                        accessibilityRole="button"
                                    >
                                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('wallet.verifyIdentity')}</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                                    {t('wallet.available', { amount: formatMinor(walletBalanceMinor, currency), upi: kyc.latest?.upi_id ?? '' })}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 }}>
                                    <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textSecondary, marginRight: 6 }}>₹</Text>
                                    <TextInput
                                        value={withdrawText}
                                        onChangeText={(t) => setWithdrawText(t.replace(/[^0-9]/g, ''))}
                                        placeholder={t('wallet.amount')}
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="number-pad"
                                        maxLength={7}
                                        style={{ flex: 1, paddingVertical: 14, fontSize: 24, fontWeight: '800', color: colors.text }}
                                        accessibilityLabel={t('wallet.withdrawAmountLabel')}
                                    />
                                    <TouchableOpacity onPress={() => setWithdrawText(String(Math.floor(walletBalanceMinor / 100)))}>
                                        <Text style={{ color: themeColors.primary, fontWeight: '700' }}>{t('wallet.max')}</Text>
                                    </TouchableOpacity>
                                </View>
                                {withdrawText.length > 0 && !withdrawValid && (
                                    <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 8 }}>
                                        {t('wallet.withdrawRange', { min: MIN_WITHDRAW_RUPEES })}
                                    </Text>
                                )}
                                <TouchableOpacity
                                    onPress={submitWithdraw}
                                    disabled={!withdrawValid || requestPayout.isPending}
                                    style={{ marginTop: 20, backgroundColor: themeColors.primary, opacity: !withdrawValid || requestPayout.isPending ? 0.5 : 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                    accessibilityRole="button"
                                >
                                    {requestPayout.isPending && <ActivityIndicator size="small" color="#fff" />}
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('wallet.withdraw')}</Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>
                                    {t('wallet.transferTime')}
                                </Text>
                            </>
                        )}
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
