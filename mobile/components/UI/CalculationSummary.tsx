import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CalculationSummaryProps {
    label: string;
    value: string;
    highlight?: boolean;
}

export default function CalculationSummary({ label, value, highlight = false }: CalculationSummaryProps) {
    return (
        <View style={[styles.container, highlight && styles.containerHighlight]}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, highlight && styles.valueHighlight]}>₹{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginTop: 12,
    },
    containerHighlight: {
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    label: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    value: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    valueHighlight: {
        color: '#6366F1',
    },
});
