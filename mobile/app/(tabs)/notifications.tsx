import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';

export default function NotificationsPage() {
    return (
        <ScreenWrapper>
            <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row justify-between items-center">
                <Text className="text-xl font-bold text-gray-900">Notifications</Text>
                <Ionicons name="checkmark-done-circle-outline" size={24} color="#6B7280" />
            </View>

            <ScrollView className="flex-1 px-4 py-4">
                {[
                    { title: 'Tweak Completed', desc: 'Your electrical repair tweak has been marked as completed.', time: '2 mins ago', icon: 'checkmark-circle', color: '#10B981' },
                    { title: 'New Offer', desc: 'Get 20% off on your next cleaning service.', time: '2 hours ago', icon: 'gift', color: '#F97316' },
                    { title: 'Wallet Top-up', desc: '₹500 added to your wallet successfully.', time: '1 day ago', icon: 'wallet', color: '#3B82F6' },
                ].map((item, index) => (
                    <View key={index} className="flex-row items-start bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm">
                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3`} style={{ backgroundColor: `${item.color}20` }}>
                            <Ionicons name={item.icon as any} size={20} color={item.color} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 mb-1">{item.title}</Text>
                            <Text className="text-gray-600 text-sm mb-1">{item.desc}</Text>
                            <Text className="text-gray-400 text-xs">{item.time}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </ScreenWrapper>
    );
}
