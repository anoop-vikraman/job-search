import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@tweak/theme';

interface CalculationSummaryProps {
    label: string;
    value: string;
    highlight?: boolean;
}

export default function CalculationSummary({ label, value, highlight = false }: CalculationSummaryProps): React.JSX.Element {
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
        backgroundColor: palette.gray50,
        borderRadius: 12,
        marginTop: 12,
    },
    containerHighlight: {
        backgroundColor: palette.indigo50,
        borderWidth: 1,
        borderColor: palette.indigo100,
    },
    label: {
        fontSize: 14,
        color: palette.gray500,
        fontWeight: '500',
    },
    value: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.gray900,
    },
    valueHighlight: {
        color: palette.indigo500,
    },
});
