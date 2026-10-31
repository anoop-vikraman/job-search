import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PriceValidationMessageProps {
    amount: number;
    minAmount?: number;
    recommendedAmount?: number;
}

export default function PriceValidationMessage({
    amount,
    minAmount = 200,
    recommendedAmount = 1000
}: PriceValidationMessageProps) {
    if (!amount || amount === 0) return null;

    const getValidationState = () => {
        if (amount < minAmount) {
            return {
                color: '#EF4444',
                bgColor: '#FEE2E2',
                borderColor: '#EF4444',
                message: `Too low!! Increase the amount to ₹${minAmount} at least`,
                icon: '⚠️'
            };
        }
        if (amount < recommendedAmount) {
            return {
                color: '#F59E0B',
                bgColor: '#FEF3C7',
                borderColor: '#F59E0B',
                message: 'Not bad! A little extra would make this pop.',
                icon: '💡'
            };
        }
        return {
            color: '#10B981',
            bgColor: '#D1FAE5',
            borderColor: '#10B981',
            message: 'Solid offer! You can increase this further to maximise your chances.',
            icon: '✓'
        };
    };

    const state = getValidationState();

    return (
        <View style={[styles.container, { backgroundColor: state.bgColor, borderColor: state.borderColor }]}>
            <Text style={styles.icon}>{state.icon}</Text>
            <Text style={[styles.message, { color: state.color }]}>{state.message}</Text>
        </View>
    );
}

export function getBorderColor(amount: number, minAmount = 200, recommendedAmount = 1000): string {
    if (!amount || amount === 0) return '#D1D5DB';
    if (amount < minAmount) return '#EF4444';
    if (amount < recommendedAmount) return '#F59E0B';
    return '#10B981';
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
    },
    icon: {
        fontSize: 16,
        marginRight: 8,
    },
    message: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
    },
});
