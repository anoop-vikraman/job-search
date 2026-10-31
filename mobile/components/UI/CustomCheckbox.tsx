import { palette } from '@tweak/theme';
import React from 'react';
import { StyleProp, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { themeColors } from '../../themes/colors';
import { useTheme } from '../../themes/ThemeProvider';

interface Props {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    containerStyle?: StyleProp<ViewStyle>;
    color?: string;
}

export default function CustomCheckbox({
    label,
    description,
    checked,
    onChange,
    containerStyle,
    color = themeColors.primary
}: Props): React.JSX.Element {
    const { isDark } = useTheme();
    return (
        <View style={containerStyle}>
            <TouchableOpacity
                onPress={() => onChange(!checked)}
                className="flex-row items-center justify-between py-2"
                activeOpacity={0.7}
            >
                <View className="flex-1 mr-4">
                    <Text className="text-base font-semibold text-gray-800 dark:text-slate-50">
                        {label}
                    </Text>
                    {description && (
                        <Text className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            {description}
                        </Text>
                    )}
                </View>

                {/* Toggle/Checkbox Visual */}
                <View
                    style={{
                        backgroundColor: checked ? color : isDark ? palette.slate700 : palette.gray200,
                        width: 50,
                        height: 28,
                        borderRadius: 16,
                        padding: 2,
                        justifyContent: 'center',
                        alignItems: checked ? 'flex-end' : 'flex-start'
                    }}
                >
                    <View
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: 'white',
                            shadowColor: palette.black,
                            shadowOffset: {
                                width: 0,
                                height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                        }}
                    />
                </View>
            </TouchableOpacity>
        </View>
    );
}
