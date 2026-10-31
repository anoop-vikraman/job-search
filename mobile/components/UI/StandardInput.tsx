import React, { forwardRef } from 'react';
import { StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '../../themes/ThemeProvider';

export interface StandardInputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: StyleProp<ViewStyle>;
    leftComponent?: React.ReactNode;
    rightComponent?: React.ReactNode;
}

export const StandardInput = forwardRef<React.ComponentRef<typeof TextInput>, StandardInputProps>(({
    label,
    error,
    containerStyle,
    style,
    className,
    leftComponent,
    rightComponent,
    ...props
}, ref) => {
    const { isDark, colors } = useTheme();
    return (
        <View style={containerStyle} className="mb-2">
            {label && (
                <Text className="text-gray-400 dark:text-slate-400 text-[10px] font-bold mb-1 uppercase tracking-widest px-1">
                    {label}
                </Text>
            )}
            <View className={`bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 border flex-row items-center ${error ? 'border-red-500' : 'border-gray-100 dark:border-slate-700'} ${props.multiline ? 'items-start py-0' : ''}`}>
                {leftComponent && (
                    <View className="mr-3">
                        {leftComponent}
                    </View>
                )}

                <TextInput
                    ref={ref}
                    className={`flex-1 py-3 text-gray-900 dark:text-slate-50 text-base font-medium ${props.multiline ? 'min-h-[80px]' : ''} ${className || ''}`}
                    placeholderTextColor={isDark ? colors.textMuted : '#999'}
                    textAlignVertical={props.multiline ? 'top' : 'center'}
                    {...props}
                />

                {rightComponent && (
                    <View className="ml-3">
                        {rightComponent}
                    </View>
                )}
            </View>
            {error && <Text className="text-red-500 text-[10px] mt-1 px-1">{error}</Text>}
        </View>
    );
});

StandardInput.displayName = 'StandardInput';
