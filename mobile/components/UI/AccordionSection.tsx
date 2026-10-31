import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { palette } from '@tweak/theme';
import { themeColors } from '../../themes/colors';
import { useTheme } from '../../themes/ThemeProvider';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionSectionProps {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    isCompleted?: boolean;
}

export default function AccordionSection({
    title,
    icon,
    isExpanded,
    onToggle,
    children,
    isCompleted = false,
}: AccordionSectionProps): React.JSX.Element {
    const { colors, isDark } = useTheme();
    const handleToggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle();
    };

    return (
        <View style={[styles.container, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
                style={[
                    styles.header,
                    isDark && { backgroundColor: colors.surface },
                    isExpanded && styles.headerExpanded,
                    isExpanded && isDark && { backgroundColor: colors.surfaceMuted, borderBottomColor: colors.border }
                ]}
                onPress={handleToggle}
                activeOpacity={0.7}
            >
                <View style={styles.headerLeft}>
                    <View style={[styles.iconContainer, isExpanded && styles.iconContainerExpanded]}>
                        <Ionicons
                            name={icon}
                            size={20}
                            color={isExpanded ? 'white' : themeColors.primary}
                        />
                    </View>
                    <Text style={[styles.title, isDark && !isExpanded && { color: colors.text }, isExpanded && styles.titleExpanded]}>{title}</Text>
                </View>
                <View style={styles.headerRight}>
                    {isCompleted && !isExpanded && (
                        <View style={styles.checkmark}>
                            <Ionicons name="checkmark-circle" size={20} color={palette.green600} />
                        </View>
                    )}
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={isExpanded ? themeColors.primary : isDark ? colors.textMuted : palette.gray400}
                    />
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={[styles.content, isDark && { backgroundColor: colors.surface }]}>
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.gray200,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'white',
    },
    headerExpanded: {
        backgroundColor: palette.gray50,
        borderBottomWidth: 1,
        borderBottomColor: palette.gray200,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: palette.indigo50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerExpanded: {
        backgroundColor: themeColors.primary,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: palette.gray900,
        flex: 1,
    },
    titleExpanded: {
        color: themeColors.primary,
        fontWeight: '700',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkmark: {
        marginRight: 4,
    },
    content: {
        padding: 20,
        backgroundColor: 'white',
    },
});
