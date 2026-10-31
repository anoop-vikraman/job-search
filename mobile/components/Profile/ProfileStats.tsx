import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { palette } from '@tweak/theme';

const stats = { tweaksCreated: 0, tweaksCompleted: 0, rating: 0, totalReviews: 0 };

export default function ProfileStats(): React.JSX.Element {
    const { tweaksCreated, tweaksCompleted, rating, totalReviews } = stats;

    return (
        <View className="px-6 py-4">
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <View className="flex-row justify-around">
                    {/* Tweaks Created */}
                    <View className="items-center flex-1">
                        <View className="bg-orange-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                            <Ionicons name="add-circle" size={24} color={palette.orange500} />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 dark:text-slate-50">{tweaksCreated}</Text>
                        <Text className="text-xs text-gray-500 dark:text-slate-400 text-center">Tweaks{'\n'}Created</Text>
                    </View>

                    {/* Divider */}
                    <View className="w-[1px] bg-gray-200 dark:bg-slate-700 mx-2" />

                    {/* Tweaks Completed */}
                    <View className="items-center flex-1">
                        <View className="bg-green-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                            <Ionicons name="checkmark-circle" size={24} color={palette.green600} />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 dark:text-slate-50">{tweaksCompleted}</Text>
                        <Text className="text-xs text-gray-500 dark:text-slate-400 text-center">Tweaks{'\n'}Completed</Text>
                    </View>

                    {/* Divider */}
                    <View className="w-[1px] bg-gray-200 dark:bg-slate-700 mx-2" />

                    {/* Rating */}
                    <View className="items-center flex-1">
                        <View className="bg-yellow-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                            <Ionicons name="star" size={24} color={palette.amber500} />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 dark:text-slate-50">{rating.toFixed(1)}</Text>
                        <Text className="text-xs text-gray-500 dark:text-slate-400 text-center">{totalReviews} Reviews</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
