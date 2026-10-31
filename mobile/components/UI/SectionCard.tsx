import { Ionicons } from '@expo/vector-icons';
import { palette } from '@tweak/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../themes/ThemeProvider';

interface SectionCardProps {
    children: React.ReactNode;
    onEdit?: () => void;
    title?: string;
}

export default function SectionCard({ children, onEdit, title }: SectionCardProps): React.JSX.Element {
    const { colors, isDark } = useTheme();
    return (
        <View style={[styles.container, isDark && { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            {title && (
                <View style={{ marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : palette.gray100 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? colors.text : palette.gray900 }}>{title}</Text>
                </View>
            )}

            {onEdit && (
                <TouchableOpacity style={styles.editButton} onPress={onEdit} activeOpacity={0.7}>
                    <Ionicons name="pencil" size={16} color={palette.indigo500} />
                    <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
            )}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderTopWidth: 3,
        borderTopColor: palette.gray200,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    editButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: palette.indigo50,
        borderRadius: 8,
        zIndex: 10,
    },
    editText: {
        fontSize: 14,
        fontWeight: '600',
        color: palette.indigo500,
    },
    content: {
        paddingRight: 80, // Space for edit button
    },
});
