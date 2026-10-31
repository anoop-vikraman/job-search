import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const profileCompletion = { percentage: 0, nextStep: 'Complete your profile' };

export default function ProfileCompletionCard() {
    const router = useRouter();
    const { percentage, nextStep } = profileCompletion;

    // Don't show if 100% complete
    if (percentage >= 100) return null;

    return (
        <View className="px-6 py-2">
            <View className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
                <View className="flex-row items-center">
                    <View className="bg-orange-500 w-16 h-16 rounded-full items-center justify-center mr-4">
                        <Text className="text-white font-bold text-xl">{percentage}%</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-gray-900 text-base mb-1">Complete profile</Text>
                        <Text className="text-gray-600 text-sm mb-2">Your next step: <Text className="font-semibold">{nextStep}</Text></Text>
                        <TouchableOpacity
                            onPress={() => router.push('/profile/setup')}
                            className="bg-orange-500 px-4 py-2 rounded-lg self-start"
                        >
                            <Text className="text-white font-semibold text-sm">Complete now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}
