import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useCreateTweakStore } from '../../store/useCreateTweakStore';
import { themeColors } from '../../themes/colors';
import SavedAddressesList from '../Location/SavedAddressesList';

const STEPS = [
    { id: 'start', icon: 'grid' },
    { id: 'details', icon: 'document-text' },
    { id: 'preferences', icon: 'options' },
    { id: 'schedule', icon: 'calendar' },
    { id: 'pricing', icon: 'wallet' },
    { id: 'preview', icon: 'eye' }
];

interface CreateFlowHeaderProps {
    stepLabel?: string;
    onBack?: () => void;
    progress?: number; // 0 to 1
    hideAddress?: boolean;
}

export default function CreateFlowHeader({
    stepLabel,
    onBack,
    progress = 0,
    hideAddress = false
}: CreateFlowHeaderProps) {
    const router = useRouter();
    const tweakType = useCreateTweakStore((state) => state.tweakType);
    const address = useCreateTweakStore((state) => state.address);
    const setAddress = useCreateTweakStore((state) => state.setAddress);

    const [showAddressModal, setShowAddressModal] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    const glowScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.6);

    useEffect(() => {
        glowScale.value = withRepeat(withTiming(1.6, { duration: 1000 }), -1, true);
        glowOpacity.value = withRepeat(withTiming(0.2, { duration: 1000 }), -1, true);
    }, []);

    const glowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: glowScale.value }],
        opacity: glowOpacity.value,
    }));

    // Dynamic steps based on Tweak Type
    const currentSteps = tweakType === 'in_person'
        ? [
            { id: 'location', icon: 'location' },
            { id: 'category', icon: 'grid' },
            { id: 'details', icon: 'document-text' },
            { id: 'preferences', icon: 'options' },
            { id: 'schedule', icon: 'calendar' },
            { id: 'pricing', icon: 'wallet' },
        ]
        : [
            { id: 'category', icon: 'grid' },
            { id: 'details', icon: 'document-text' },
            { id: 'preferences', icon: 'options' },
            { id: 'schedule', icon: 'calendar' },
            { id: 'pricing', icon: 'wallet' },
        ];

    // Map progress to index
    let currentIndex = 0;
    const stepCount = currentSteps.length;

    // Standardized mapping for better snap accuracy
    if (tweakType === 'in_person') {
        if (progress >= 0.80) currentIndex = 5; // pricing
        else if (progress >= 0.60) currentIndex = 4; // schedule
        else if (progress >= 0.45) currentIndex = 3; // preferences
        else if (progress >= 0.35) currentIndex = 2; // details
        else if (progress >= 0.20) currentIndex = 1; // category
        else currentIndex = 0; // location
    } else {
        if (progress >= 0.80) currentIndex = 4; // pricing
        else if (progress >= 0.60) currentIndex = 3; // schedule
        else if (progress >= 0.45) currentIndex = 2; // preferences
        else if (progress >= 0.32) currentIndex = 1; // details
        else currentIndex = 0; // category
    }

    // Ensure index is within bounds
    currentIndex = Math.max(0, Math.min(currentIndex, stepCount - 1));

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    const handleAddressPress = () => {
        setShowAddressModal(true);
    };

    const renderCenterContent = () => {
        if (!hideAddress && tweakType === 'in_person' && address) {
            // Priority: houseNo + area + city, then formattedAddress, then Location
            const subtitle = [address.houseNo, address.area, address.city].filter(Boolean).join(', ') || address.formattedAddress || 'Selected Location';
            const title = address.saveAs || 'Location';

            return (
                <TouchableOpacity
                    onPress={handleAddressPress}
                    className="flex-row items-center flex-1"
                >
                    <View className="p-1.5 bg-blue-50 rounded-full mr-2">
                        <Ionicons name="location" size={16} color={themeColors.primary} />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text numberOfLines={1} className="font-bold text-sm text-primary mr-1">{title}</Text>
                            <Ionicons name="chevron-down" size={12} color={themeColors.primary} />
                        </View>
                        <Text numberOfLines={1} className="text-[10px] text-gray-500">
                            {subtitle}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <Text className="text-lg font-bold text-gray-900">{stepLabel || "Create Tweak"}</Text>
        );
    };

    return (
        <View className="bg-white border-b border-gray-100">
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity onPress={handleBack} className="p-2 -ml-2 rounded-full active:bg-gray-100">
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>

                <View className="flex-1 px-4">
                    {renderCenterContent()}
                </View>

                <View className="w-8" />
            </View>

            {/* Stepper Progress Bar - Hidden on Review/Preview Page (progress === 1.0) */}
            {progress < 1.0 && (
                <View className="bg-white px-6 pb-6 pt-2">
                    <View
                        className="h-10 justify-center"
                        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                    >
                        {/* Progress Track Container */}
                        <View className="absolute left-0 right-0 h-full justify-center">
                            {/* Background Line */}
                            <View className="h-[2px] bg-gray-100 w-full" />

                            {/* Active Line - Starts at container left, reaches current icon's edge */}
                            <View
                                className="absolute left-0 h-[2px] bg-[#007AFF]"
                                style={{
                                    width: containerWidth > 0 && stepCount > 1
                                        ? 20 + (currentIndex * (containerWidth - 80) / (stepCount - 1))
                                        : containerWidth > 0 ? 20 : 0
                                }}
                            />
                        </View>

                        {/* Circles */}
                        <View className="flex-row items-center justify-between w-full px-5">
                            {currentSteps.map((step, index) => {
                                const isActive = index <= currentIndex;
                                return (
                                    <View key={step.id} className="items-center justify-center w-10">
                                        {index === currentIndex && (
                                            <Animated.View
                                                style={[{
                                                    position: 'absolute',
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 22,
                                                    backgroundColor: '#007AFF',
                                                    shadowColor: '#007AFF',
                                                    shadowOffset: { width: 0, height: 0 },
                                                    shadowOpacity: 0.4,
                                                    shadowRadius: 8,
                                                }, glowStyle]}
                                            />
                                        )}
                                        <View className="bg-white rounded-full p-1 shadow-sm items-center justify-center">
                                            <View
                                                className={`w-8 h-8 rounded-full items-center justify-center ${isActive ? 'bg-[#007AFF]' : 'bg-blue-50 border border-blue-100'}`}
                                            >
                                                <Ionicons
                                                    name={isActive ? step.icon as any : `${step.icon}-outline` as any}
                                                    size={14}
                                                    color={isActive ? 'white' : '#007AFF'}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </View>
            )}

            {/* Address Selection Modal */}
            {tweakType === 'in_person' && (
                <SavedAddressesList
                    visible={showAddressModal}
                    onClose={() => setShowAddressModal(false)}
                    onSelect={(addr) => {
                        setAddress(addr);
                        setShowAddressModal(false);
                    }}
                    currentAddressId={address?.id}
                />
            )}
        </View>
    );
}
