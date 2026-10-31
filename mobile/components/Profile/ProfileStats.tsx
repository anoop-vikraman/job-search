import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

const stats = { tweaksCreated: 0, tweaksCompleted: 0, rating: 0, totalReviews: 0 };

export default function ProfileStats() {
    const { tweaksCreated, tweaksCompleted, rating, totalReviews } = stats;

    return (
        <View className="px-6 py-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <View className="flex-row justify-around">
                    {/* Tweaks Created */}
                    <View className="items-center flex-1">
                        <View className="bg-orange-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                            <Ionicons name="add-circle" size={24} color="#F97316" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900">{tweaksCreated}</Text>
                        <Text className="text-xs text-gray-500 text-center">Tweaks{'\n'}Created</Text>
                    </View>

                    {/* Divider */}
                    <View className="w-[1px] bg-gray-200 mx-2" />

                    {/* Tweaks Completed */}
                    <View className="items-center flex-1">
                        <View className="bg-green-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900">{tweaksCompleted}</Text>
                        <Text className="text-xs text-gray-500 text-center">Tweaks{'\n'}Completed</Text>
                    </View>

                    {/* Divider */}
                    <View className="w-[1px] bg-gray-200 mx-2" />

                    {/* Rating */}
                    <View className="items-center flex-1">
                        <View className="bg-yellow-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                            <Ionicons name="star" size={24} color="#F59E0B" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900">{rating.toFixed(1)}</Text>
                        <Text className="text-xs text-gray-500 text-center">{totalReviews} Reviews</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
