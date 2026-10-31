import React from 'react';
import { Text, View } from 'react-native';

import { CostSummaryCardProps } from '../../types/tweak';

export default function CostSummaryCard({
    tweakCost,
    platformFee = 20,
    currencySymbol = '₹'
}: CostSummaryCardProps): React.JSX.Element {
    const totalCost = tweakCost + platformFee;

    return (
        <View className="bg-gray-100/80 rounded-3xl p-6 mb-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">Cost Summary</Text>

            <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600 font-medium">Tweak Cost</Text>
                <Text className="text-gray-900 font-bold">{currencySymbol}{tweakCost}</Text>
            </View>

            <View className="flex-row justify-between mb-4 pb-4 border-b border-gray-300">
                <Text className="text-gray-600 font-medium">Platform Fees</Text>
                <Text className="text-gray-900 font-bold">{currencySymbol}{platformFee}</Text>
            </View>

            <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-gray-900">Total Cost</Text>
                <Text className="text-2xl font-extrabold text-gray-900">{currencySymbol}{totalCost}</Text>
            </View>
        </View>
    );
}
