import { Ionicons } from '@expo/vector-icons';
import { palette } from '@tweak/theme';
import React from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import { ConfirmationModalProps } from '../../types/ui';

export default function CustomConfirmationModal({
    visible,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    isLoading = false,
}: ConfirmationModalProps) {
    const getVariantConfig = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: 'alert-circle',
                    iconColor: palette.red500,
                    bgColor: 'bg-red-50',
                    btnColor: 'bg-red-500',
                };
            case 'success':
                return {
                    icon: 'checkmark-circle',
                    iconColor: palette.green600,
                    bgColor: 'bg-emerald-50',
                    btnColor: 'bg-emerald-500',
                };
            case 'warning':
                return {
                    icon: 'warning',
                    iconColor: palette.amber500,
                    bgColor: 'bg-amber-50',
                    btnColor: 'bg-amber-500',
                };
            case 'info':
            default:
                return {
                    icon: 'information-circle',
                    iconColor: palette.blue500,
                    bgColor: 'bg-blue-50',
                    btnColor: 'bg-blue-500',
                };
        }
    };

    const config = getVariantConfig();

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center bg-black/50 px-10">
                <View className="bg-white rounded-[32px] w-full p-6 shadow-2xl">
                    <View className="items-center mb-4">
                        <View className={`${config.bgColor} p-4 rounded-full`}>
                            <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={32} color={config.iconColor} />
                        </View>
                    </View>

                    <Text className="text-xl font-bold text-gray-900 text-center mb-1 px-2">
                        {title}
                    </Text>
                    <Text className="text-gray-500 text-center text-sm mb-6 px-4 leading-5">
                        {message}
                    </Text>

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={onClose}
                            className="flex-1 bg-gray-50 py-3 rounded-xl items-center border border-gray-100"
                            disabled={isLoading}
                        >
                            <Text className="text-gray-500 font-bold text-base">{cancelLabel}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={onConfirm}
                            className={`flex-1 ${config.btnColor} py-3 rounded-xl items-center shadow-lg shadow-black/10`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-base">{confirmLabel}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
