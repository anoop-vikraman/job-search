import React from 'react';
import { StyleProp, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { themeColors } from '../../themes/colors';

interface Option {
    label: string;
    value: string | boolean;
}

interface Props {
    label?: string;
    options: Option[];
    value: string | boolean | null;
    onChange: (value: string | boolean | null) => void;
    containerStyle?: StyleProp<ViewStyle>;
}

export default function CustomToggleButton({
    label,
    options,
    value,
    onChange,
    containerStyle
}: Props) {
    return (
        <View style={containerStyle}>
            {label && (
                <Text className="text-gray-700 text-base mb-3">{label}</Text>
            )}
            <View className="flex-row bg-gray-100 rounded-lg p-1">
                {options.map((option, index) => {
                    const isSelected = value === option.value;
                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => onChange(option.value)}
                            className={`flex-1 py-3 rounded-md items-center justify-center`}
                            style={{
                                backgroundColor: isSelected ? 'white' : 'transparent',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isSelected ? 0.1 : 0,
                                shadowRadius: 1,
                                elevation: isSelected ? 2 : 0,
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                className={`text-base font-medium ${isSelected ? 'text-primary' : 'text-gray-500'}`}
                                style={{ color: isSelected ? themeColors.primary : '#6B7280' }}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}
