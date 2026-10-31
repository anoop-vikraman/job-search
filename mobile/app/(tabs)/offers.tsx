import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';

export default function OffersPage() {
    return (
        <ScreenWrapper>
            <View className="px-6 py-4 bg-white border-b border-gray-100">
                <Text className="text-xl font-bold text-gray-900">Offers & Rewards</Text>
            </View>

            <ScrollView className="flex-1 px-4 py-4">
                {/* Placeholder Offers */}
                <View className="bg-orange-50 rounded-2xl p-4 mb-4 border border-orange-100 flex-row items-center">
                    <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center mr-4">
                        <Ionicons name="gift" size={24} color="#F97316" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-gray-900 text-lg">50% OFF First Tweak</Text>
                        <Text className="text-gray-600 text-sm">Use code: WELCOME50</Text>
                    </View>
                </View>

                <View className="bg-purple-50 rounded-2xl p-4 mb-4 border border-purple-100 flex-row items-center">
                    <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mr-4">
                        <Ionicons name="prism" size={24} color="#7C3AED" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-gray-900 text-lg">Premium Membership</Text>
                        <Text className="text-gray-600 text-sm">Get early access to jobs</Text>
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}
