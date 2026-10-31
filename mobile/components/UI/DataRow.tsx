import { palette } from '@tweak/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../themes/ThemeProvider';

interface DataRowProps {
    label: string;
    value: string | number;
    highlight?: boolean;
}

export default function DataRow({ label, value, highlight = false }: DataRowProps): React.JSX.Element {
    const { colors, isDark } = useTheme();
    return (
        <View style={styles.container}>
            <Text style={[styles.label, isDark && { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.value, isDark && !highlight && { color: colors.text }, highlight && styles.valueHighlight]}>
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
        color: palette.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    value: {
        fontSize: 16,
        color: palette.gray900,
        fontWeight: '500',
        lineHeight: 24,
    },
    valueHighlight: {
        color: palette.indigo500,
        fontWeight: 'bold',
    },
});
