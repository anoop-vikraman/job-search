import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, TouchableOpacity, View } from 'react-native';

import { ActionSheetModalProps } from '../../types/ui';

// Helper Text component import workaround since we missed importing Text above
import { Text } from 'react-native';

export default function ActionSheetModal({
    visible,
    onClose,
    children,
    title,
    subtitle,
    showCloseButton = true,
    height = 'h-[85%]'
}: ActionSheetModalProps) {
    // Refs for scroll management
    const scrollViewRef = React.useRef<React.ComponentRef<typeof ScrollView>>(null);

    // No longer scrolling to end globally as it can be jarring
    // Relying on KeyboardAvoidingView and ScrollView's natural padding
    React.useEffect(() => {
        // We can add logic here if specific scroll-to-focus is needed
    }, []);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/30">
                <View className={`bg-white ${height} rounded-t-3xl w-full overflow-hidden`}>
                    <KeyboardAvoidingView
                        behavior="padding"
                        style={{ flex: height ? 1 : 0 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
                        enabled={true}
                    >
                        <ScrollView
                            ref={scrollViewRef}
                            showsVerticalScrollIndicator={false}
                            contentContainerClassName="pb-10 px-6 pt-6"
                            keyboardShouldPersistTaps="handled"
                            scrollEventThrottle={16}
                            bounces={height ? true : false}
                        >
                            {(title || showCloseButton) && (
                                <View className="flex-row justify-between items-center mb-4">
                                    <View className="flex-1 pr-4">
                                        {title && (
                                            <TouchableOpacity activeOpacity={1}>
                                                {/* activeOpacity=1 to prevent touch perception issues if user taps title */}
                                                {/* Usually title is just text, but wrapper keeps layout consistent */}
                                                {typeof title === 'string' ? (
                                                    <View>
                                                        <Text className="text-2xl font-bold text-gray-900" numberOfLines={1}>
                                                            {title}
                                                        </Text>
                                                        {subtitle && (
                                                            <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                                                                {subtitle}
                                                            </Text>
                                                        )}
                                                    </View>
                                                ) : (
                                                    title
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {showCloseButton && (
                                        <TouchableOpacity
                                            onPress={onClose}
                                            className="bg-gray-100 p-2 rounded-full"
                                        >
                                            <Ionicons name="close" size={20} color="#666" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {children}
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
}
