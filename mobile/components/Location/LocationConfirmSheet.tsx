import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { palette } from '@tweak/theme';
import { themeColors } from '../../themes/colors';
import CustomButton from '../UI/CustomButton';

interface LocationConfirmSheetProps {
    formattedAddress: string;
    latitude: number;
    longitude: number;
    onConfirm: () => void;
    visible?: boolean;
}

export default function LocationConfirmSheet({
    formattedAddress,
    latitude,
    longitude,
    onConfirm,
    visible = true
}: LocationConfirmSheetProps): React.JSX.Element | null {
    if (!visible) return null;

    return (
        <View className="absolute bottom-0 w-full bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl p-6 pb-10 border-t border-gray-100 dark:border-slate-700">
            {/* Drag Handle */}
            <View className="items-center mb-3 mt-[-8px]">
                <View className="w-10 h-1 bg-gray-200 dark:bg-slate-700 rounded-full" />
            </View>

            <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1 pr-4">
                    <Text className="text-gray-400 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Confirming selection</Text>
                    <View className="flex-row items-center">
                        <Text className="text-xl font-bold text-gray-900 dark:text-slate-50" numberOfLines={1}>
                            {formattedAddress.split(',')[0] || 'Selected Location'}
                        </Text>
                    </View>
                    <Text className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 leading-4" numberOfLines={2}>
                        {formattedAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
                    </Text>
                </View>
                <View className="bg-primary/10 p-2.5 rounded-xl">
                    <Ionicons name="location" size={24} color={themeColors.primary} />
                </View>
            </View>

            <View className="bg-orange-50/80 p-3 rounded-xl flex-row items-center mb-5 border border-orange-100/50">
                <Ionicons name="flash" size={14} color={palette.amber500} />
                <Text className="text-orange-800 text-[10px] ml-2 font-medium">
                    Applicants will navigate exactly to this pin.
                </Text>
            </View>

            <CustomButton
                onPress={onConfirm}
                variant="filled"
                className="rounded-xl shadow-xl shadow-primary/25 h-14"
            >
                <Text className="text-white font-bold text-base">Select & Enter Details</Text>
            </CustomButton>
        </View>
    );
}
