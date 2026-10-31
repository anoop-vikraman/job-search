import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { palette } from '@tweak/theme';

export default function HelpPage(): React.JSX.Element {
    const router = useRouter();

    return (
        <ScreenWrapper>
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={palette.gray900} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Help Center</Text>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
                <Text className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</Text>

                {[
                    { q: 'How do I create a tweak?', a: 'Tap on "Create Tweak" from the home page and follow the steps to post your job requirement.' },
                    { q: 'How do I apply for a tweak?', a: 'Browse available tweaks in the "Apply for Tweaks" section and tap "Apply" on jobs that interest you.' },
                    { q: 'How do refunds work?', a: 'If you\'re not satisfied with a service, you can request a refund from your order details page.' },
                    { q: 'What is the reliability score?', a: 'Your reliability score is calculated based on your positive and negative actions on the platform.' },
                ].map((faq, index) => (
                    <View key={index} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
                        <Text className="font-bold text-gray-900 mb-2">{faq.q}</Text>
                        <Text className="text-gray-600 text-sm">{faq.a}</Text>
                    </View>
                ))}

                <View className="bg-purple-50 rounded-2xl p-6 mt-4 border border-purple-200">
                    <Text className="font-bold text-gray-900 mb-2">Still need help?</Text>
                    <Text className="text-gray-600 mb-4">Contact our support team</Text>
                    <TouchableOpacity className="bg-purple-600 py-3 rounded-xl">
                        <Text className="text-white font-bold text-center">Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}
