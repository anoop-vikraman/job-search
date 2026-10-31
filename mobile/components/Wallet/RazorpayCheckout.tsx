import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ActivityIndicator, Linking, Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';

import { useTheme } from '@/themes/ThemeProvider';
import type { RazorpaySuccess, TopupOrder } from '@/types/api';
import { Toast } from '../UI/ToastManager';

export interface CheckoutPrefill {
    name?: string;
    contact?: string;
    email?: string;
}

interface RazorpayCheckoutProps {
    order: TopupOrder;
    prefill: CheckoutPrefill;
    onSuccess: (result: RazorpaySuccess) => void;
    /** User closed Checkout without paying. */
    onDismiss: () => void;
}

type CheckoutMessage =
    | ({ type: 'success' } & RazorpaySuccess)
    | { type: 'failed'; message: string }
    | { type: 'dismiss' }
    | { type: 'error'; message: string };

const BRAND_COLOR = '#246BFD';

function buildHtml(order: TopupOrder, prefill: CheckoutPrefill): string {
    const config = {
        key: order.key_id,
        order_id: order.provider_order_id,
        amount: order.amount_minor,
        currency: order.currency,
        name: 'Tweak',
        description: 'Add money to wallet',
        prefill,
        theme: { color: BRAND_COLOR },
    };
    // Escape "<" so no value can close the <script> tag.
    const json = JSON.stringify(config).replace(/</g, '\\u003c');
    return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#fff">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function send(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  try {
    var options = ${json};
    options.handler = function (r) {
      send({ type: 'success', razorpay_order_id: r.razorpay_order_id,
             razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature });
    };
    options.modal = { ondismiss: function () { send({ type: 'dismiss' }); } };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (resp) {
      send({ type: 'failed', message: (resp && resp.error && resp.error.description) || 'Payment failed.' });
    });
    rzp.open();
  } catch (e) {
    send({ type: 'error', message: 'Could not load the payment page.' });
  }
</script>
</body></html>`;
}

function parseMessage(raw: string): CheckoutMessage | null {
    try {
        const m: unknown = JSON.parse(raw);
        if (typeof m !== 'object' || m === null || !('type' in m)) return null;
        const msg = m as Record<string, unknown>;
        if (
            msg.type === 'success' &&
            typeof msg.razorpay_order_id === 'string' &&
            typeof msg.razorpay_payment_id === 'string' &&
            typeof msg.razorpay_signature === 'string'
        ) {
            return {
                type: 'success',
                razorpay_order_id: msg.razorpay_order_id,
                razorpay_payment_id: msg.razorpay_payment_id,
                razorpay_signature: msg.razorpay_signature,
            };
        }
        if (msg.type === 'dismiss') return { type: 'dismiss' };
        if (msg.type === 'failed' || msg.type === 'error') {
            return { type: msg.type, message: typeof msg.message === 'string' ? msg.message : 'Payment failed.' };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Razorpay Standard Checkout in a WebView. The backend verifies the result; this
 * component only relays Checkout's callbacks.
 */
export default function RazorpayCheckout({ order, prefill, onSuccess, onDismiss }: RazorpayCheckoutProps): React.JSX.Element {
    const { colors } = useTheme();
    const html = useMemo(() => buildHtml(order, prefill), [order, prefill]);

    const handleMessage = (event: WebViewMessageEvent): void => {
        const msg = parseMessage(event.nativeEvent.data);
        if (!msg) return;
        switch (msg.type) {
            case 'success':
                onSuccess(msg);
                break;
            case 'dismiss':
                onDismiss();
                break;
            case 'failed':
                // Checkout stays open so the user can retry with another method.
                Toast.error(msg.message);
                break;
            case 'error':
                Toast.error(msg.message);
                onDismiss();
                break;
        }
    };

    // UPI and bank apps use custom schemes (upi://, tez://, phonepe://...): hand them to the OS.
    const handleNavigation = (req: ShouldStartLoadRequest): boolean => {
        if (/^(https?:|about:|data:|blob:)/i.test(req.url)) return true;
        Linking.openURL(req.url).catch(() => Toast.error('No app found to complete this payment.'));
        return false;
    };

    return (
        <Modal visible animationType="slide" onRequestClose={onDismiss}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'bottom']}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Secure payment</Text>
                        {order.test_mode && (
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>TEST MODE</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Cancel payment" style={{ padding: 4 }}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <WebView
                    source={{ html }}
                    originWhitelist={['*']}
                    onMessage={handleMessage}
                    onShouldStartLoadWithRequest={handleNavigation}
                    setSupportMultipleWindows={false}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState
                    renderLoading={() => (
                        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator color={colors.textMuted} />
                        </View>
                    )}
                    onError={() => {
                        Toast.error('Could not load the payment page. Check your connection.');
                        onDismiss();
                    }}
                />
            </SafeAreaView>
        </Modal>
    );
}
