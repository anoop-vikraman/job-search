import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

// Simple event emitter pattern for global access
let toastListener: ((toast: Toast) => void) | null = null;

export const Toast = {
    show: (message: string, type: ToastType = 'info') => {
        if (toastListener) {
            toastListener({ id: Math.random().toString(), message, type });
        }
    },
    success: (message: string) => Toast.show(message, 'success'),
    error: (message: string) => Toast.show(message, 'error'),
    info: (message: string) => Toast.show(message, 'info'),
    warning: (message: string) => Toast.show(message, 'warning'),
};

export default function ToastManager() {
    const [currentToast, setCurrentToast] = useState<Toast | null>(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        toastListener = (toast) => {
            setCurrentToast(toast);
            // Heightened duration for errors
            const duration = toast.type === 'error' ? 4000 : 3000;

            setTimeout(() => {
                setCurrentToast((prev) => (prev?.id === toast.id ? null : prev));
            }, duration);
        };
        return () => {
            toastListener = null;
        };
    }, []);

    if (!currentToast) return null;

    const getColors = () => {
        switch (currentToast.type) {
            case 'success': return { bg: '#10B981', icon: 'checkmark-circle' };
            case 'error': return { bg: '#EF4444', icon: 'alert-circle' };
            case 'warning': return { bg: '#F59E0B', icon: 'warning' };
            case 'info': default: return { bg: '#3B82F6', icon: 'information-circle' };
        }
    };

    const { bg, icon } = getColors();

    return (
        <Animated.View
            key={currentToast.id} // Re-render on new toast
            entering={FadeInUp.springify()}
            exiting={FadeOutUp}
            style={[styles.container, { top: insets.top + 10 }]}
        >
            <View style={[styles.card, { backgroundColor: bg }]}>
                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color="white" />
                <Text style={styles.text}>{currentToast.message}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 10000,
        alignItems: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 50,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    text: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        flexShrink: 1,
    }
});
