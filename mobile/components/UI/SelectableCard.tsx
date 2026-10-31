import { palette } from '@tweak/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../themes/ThemeProvider';

interface SelectableCardProps {
    title: string;
    children: React.ReactNode;
    isSelected: boolean;
    onSelect: () => void;
}

export default function SelectableCard({ title, children, isSelected, onSelect }: SelectableCardProps): React.JSX.Element {
    const { colors, isDark } = useTheme();
    return (
        <View style={[
            styles.container,
            isDark && { backgroundColor: colors.surface },
            isSelected ? styles.containerSelected : styles.containerUnselected,
            !isSelected && isDark && { borderColor: colors.border }
        ]}>
            <TouchableOpacity
                onPress={onSelect}
                activeOpacity={0.7}
                style={[styles.header, isDark && { backgroundColor: colors.surfaceMuted }]}
            >
                <Text style={[
                    styles.title,
                    isSelected ? styles.titleSelected : styles.titleUnselected,
                    !isSelected && isDark && { color: colors.text }
                ]}>
                    {title}
                </Text>
                <View style={[
                    styles.radio,
                    isSelected ? styles.radioSelected : styles.radioUnselected,
                    !isSelected && isDark && { borderColor: colors.border, backgroundColor: colors.surface }
                ]}>
                    {isSelected && <View style={styles.radioDot} />}
                </View>
            </TouchableOpacity>
            {isSelected && (
                <View style={styles.content}>
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    containerSelected: {
        borderColor: palette.indigo500,
        borderWidth: 2,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    containerUnselected: {
        borderColor: palette.gray200,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: palette.gray50,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    titleSelected: {
        color: palette.indigo500,
    },
    titleUnselected: {
        color: palette.gray900,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: palette.indigo500,
        backgroundColor: palette.indigo500,
    },
    radioUnselected: {
        borderColor: palette.gray300,
        backgroundColor: 'white',
    },
    radioDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 8,
    },
});
