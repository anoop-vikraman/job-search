import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DataRowProps {
    label: string;
    value: string | number;
    highlight?: boolean;
}

export default function DataRow({ label, value, highlight = false }: DataRowProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, highlight && styles.valueHighlight]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    value: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '500',
        lineHeight: 24,
    },
    valueHighlight: {
        color: '#6366F1',
        fontWeight: 'bold',
    },
});
