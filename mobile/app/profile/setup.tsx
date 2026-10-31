import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { palette } from '@tweak/theme';

interface SetupStep {
    id: number;
    title: string;
    description?: string;
    completed: boolean;
}

export default function ProfileSetupPage(): React.JSX.Element {
    const router = useRouter();

    const [steps] = useState<SetupStep[]>([
        { id: 1, title: 'Basic information', completed: true },
        { id: 2, title: 'Essential documents', description: 'Upload to fulfill regulatory obligations', completed: false },
        { id: 3, title: 'Profile photo', completed: false },
        { id: 4, title: 'Onboarding training', completed: false },
        { id: 5, title: 'Payment setup', completed: false },
    ]);

    const completedSteps = steps.filter(s => s.completed).length;
    const totalSteps = steps.length;
    const progressPercentage = (completedSteps / totalSteps) * 100;

    return (
        <ScreenWrapper>
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={palette.gray900} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Profile setup</Text>
            </View>

            <ScrollView className="flex-1 px-6 py-8">
                {/* Illustration */}
                <View className="items-center mb-8">
                    <View className="w-32 h-32 bg-green-100 rounded-full items-center justify-center mb-4">
                        <Text className="text-6xl">🎯</Text>
                    </View>
                    <Text className="font-bold text-xl text-gray-900 text-center mb-2">
                        Complete your profile to start working
                    </Text>
                    <Text className="text-gray-500 text-center">
                        {Math.round(progressPercentage)}% Complete
                    </Text>
                </View>

                {/* Steps */}
                <View className="mb-8">
                    {steps.map((step, index) => (
                        <View key={step.id} className="flex-row items-start mb-4">
                            {/* Step Icon */}
                            <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${step.completed ? 'bg-purple-600' : 'bg-gray-200'
                                }`}>
                                {step.completed ? (
                                    <Ionicons name="checkmark" size={20} color="white" />
                                ) : (
                                    <Text className="text-gray-600 font-bold">{step.id}</Text>
                                )}
                            </View>

                            {/* Step Content */}
                            <View className="flex-1">
                                <Text className={`font-semibold ${step.completed ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {step.title}
                                </Text>
                                {step.description && (
                                    <Text className="text-gray-500 text-sm mt-1">{step.description}</Text>
                                )}
                                {!step.completed && step.id === 2 && (
                                    <View className="flex-row items-center mt-2">
                                        <Ionicons name="time-outline" size={14} color={palette.gray500} />
                                        <Text className="text-gray-500 text-xs ml-1">3 mins</Text>
                                    </View>
                                )}
                            </View>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <View className="absolute left-5 top-10 w-[2px] h-8 bg-gray-200" />
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Continue Button */}
            <View className="px-6 pb-6">
                <TouchableOpacity
                    onPress={() => {
                        // Navigate to next incomplete step
                        router.back();
                    }}
                    className="bg-purple-600 py-4 rounded-xl"
                >
                    <Text className="text-white font-bold text-center text-lg">Continue</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}
