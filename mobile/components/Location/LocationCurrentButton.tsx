import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { themeColors } from '../../themes/colors';

interface LocationCurrentButtonProps {
    onPress: () => void;
    visible?: boolean;
    bottomOffset?: number;
}

export default function LocationCurrentButton({
    onPress,
    visible = true,
    bottomOffset = 230
}: LocationCurrentButtonProps) {
    if (!visible) return null;

    return (
        <View
            pointerEvents="box-none"
            className="absolute w-full items-center z-50"
            style={{ bottom: bottomOffset }}
        >
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                className="bg-white flex-row items-center px-4 py-2.5 rounded-full shadow-xl border border-gray-100"
            >
                <Ionicons name="locate" size={18} color={themeColors.primary} />
                <Text className="ml-2 text-primary font-bold text-xs">Current location</Text>
            </TouchableOpacity>
        </View>
    );
}
