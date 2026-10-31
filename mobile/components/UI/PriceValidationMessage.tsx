import { palette } from '@tweak/theme';
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
}: PriceValidationMessageProps): React.JSX.Element | null {
    if (!amount || amount === 0) return null;

    const getValidationState = () => {
        if (amount < minAmount) {
            return {
                color: palette.red500,
                bgColor: palette.red100,
                borderColor: palette.red500,
                message: `Too low!! Increase the amount to ₹${minAmount} at least`,
                icon: '⚠️'
            };
        }
        if (amount < recommendedAmount) {
            return {
                color: palette.amber500,
                bgColor: palette.amber100,
                borderColor: palette.amber500,
                message: 'Not bad! A little extra would make this pop.',
                icon: '💡'
            };
        }
        return {
            color: palette.green600,
            bgColor: palette.emerald100,
            borderColor: palette.green600,
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
    if (!amount || amount === 0) return palette.gray300;
    if (amount < minAmount) return palette.red500;
    if (amount < recommendedAmount) return palette.amber500;
    return palette.green600;
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
