import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { palette } from '@tweak/theme';

import { CustomButtonProps } from '../../types/ui';

export default function CustomButton({
    onPress,
    children,
    type = 'default',
    variant = 'filled',
    color = 'primary',
    className,
    textClassName,
    loading = false,
    disabled,
    ...props
}: CustomButtonProps): React.JSX.Element {

    const baseClasses = "py-2 px-8 items-center justify-center flex-row shadow-sm active:opacity-80";
    const roundedClasses = type === 'pill' ? "rounded-full" : "rounded-xl";

    // Dynamic classes based on variant and color
    const getThemeClasses = () => {
        const colors = {
            primary: { bg: 'bg-primary', border: 'border-primary', text: 'text-primary' },
            secondary: { bg: 'bg-secondary', border: 'border-secondary', text: 'text-secondary' },
            success: { bg: 'bg-success', border: 'border-success', text: 'text-success' },
            warning: { bg: 'bg-warning', border: 'border-warning', text: 'text-warning' },
            danger: { bg: 'bg-danger', border: 'border-danger', text: 'text-danger' },
            black: { bg: 'bg-black', border: 'border-black', text: 'text-black' },
        };

        const selectedColor = colors[color] || colors.primary;

        switch (variant) {
            case 'outlined':
                return {
                    container: `bg-transparent border ${selectedColor.border} shadow-none`,
                    text: selectedColor.text,
                    loader: selectedColor.text
                };
            case 'text':
                return {
                    container: `bg-transparent border-0 shadow-none`, 
                    text: selectedColor.text,
                    loader: selectedColor.text
                };
            case 'filled':
            default:
                return {
                    container: `${selectedColor.bg} border ${selectedColor.border}`,
                    text: 'text-white',
                    loader: palette.white
                };
        }
    };

    const { container: colorContainerClasses, text: colorTextClasses, loader: loaderColor } = getThemeClasses();

    return (
        <TouchableOpacity
            onPress={onPress}
            className={`${baseClasses} ${roundedClasses} ${colorContainerClasses} ${className || ''} ${disabled || loading ? 'opacity-60' : ''}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'filled' ? palette.white : loaderColor} size="small" />
            ) : (
                <Text className={`font-bold text-lg text-center ${colorTextClasses} ${textClassName || ''}`}>
                    {children}
                </Text>
            )}
        </TouchableOpacity>
    );
}
