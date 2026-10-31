import { palette } from '@tweak/theme';
import React from 'react';
import { StyleProp, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { themeColors } from '../../themes/colors';

interface Option {
    label: string;
    value: string | boolean;
}

interface Props {
    options: Option[];
    value: string | boolean | null;
    onChange: (value: string | boolean | null) => void;
    layout?: 'row' | 'column';
    containerStyle?: StyleProp<ViewStyle>;
    labelStyle?: StyleProp<TextStyle>;
}

export function CustomRadioButton({
    options,
    value,
    onChange,
    layout = 'row',
    containerStyle,
    labelStyle
}: Props) {
    return (
        <View className={`flex-wrap ${layout === 'row' ? 'flex-row gap-6' : 'gap-3'}`} style={containerStyle}>
            {options.map((option, index) => {
                const isSelected = value === option.value;
                return (
                    <TouchableOpacity
                        key={index}
                        onPress={() => onChange(option.value)}
                        className="flex-row items-center"
                        activeOpacity={0.7}
                    >
                        <View
                            className={`w-5 h-5 rounded-full border items-center justify-center mr-2 ${isSelected ? 'border-primary' : 'border-gray-400'}`}
                            style={{ borderColor: isSelected ? themeColors.primary : palette.gray400 }}
                        >
                            {isSelected && (
                                <View
                                    className="w-3 h-3 rounded-full bg-primary"
                                    style={{ backgroundColor: themeColors.primary }}
                                />
                            )}
                        </View>
                        <Text className="text-base text-gray-700 font-medium" style={labelStyle}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

export default CustomRadioButton;
