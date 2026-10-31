import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { palette } from '@tweak/theme';

interface PastTweak { id: string; title: string; status: string; date: string; amount: number; rating?: number }

const createdTweaks: PastTweak[] = [];
const completedTweaks: PastTweak[] = [];

export default function PastTweaksTabs() {
    const [activeTab, setActiveTab] = useState<'created' | 'completed'>('created');

    const renderTweakCard = (tweak: PastTweak) => (
        <View key={tweak.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-start mb-2">
                <Text className="font-bold text-gray-900 flex-1">{tweak.title}</Text>
                <View className={`px-3 py-1 rounded-full ${tweak.status === 'Completed' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                    <Text className={`text-xs font-semibold ${tweak.status === 'Completed' ? 'text-green-700' : 'text-orange-700'
                        }`}>{tweak.status}</Text>
                </View>
            </View>

            <Text className="text-gray-500 text-sm mb-2">{tweak.date}</Text>

            <View className="flex-row justify-between items-center">
                <Text className="font-bold text-gray-900">₹{tweak.amount}</Text>
                {tweak.rating && (
                    <View className="flex-row items-center">
                        {[...Array(5)].map((_, i) => (
                            <Ionicons
                                key={i}
                                name={i < tweak.rating! ? 'star' : 'star-outline'}
                                size={16}
                                color={palette.amber500}
                            />
                        ))}
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View className="px-6 py-4">
            <Text className="text-gray-500 font-bold text-xs uppercase mb-4 tracking-wider">PAST TWEAKS</Text>

            {/* Tabs */}
            <View className="flex-row mb-4 bg-gray-100 rounded-xl p-1">
                <TouchableOpacity
                    onPress={() => setActiveTab('created')}
                    className={`flex-1 py-3 rounded-lg ${activeTab === 'created' ? 'bg-black' : 'bg-transparent'}`}
                >
                    <Text className={`text-center font-semibold ${activeTab === 'created' ? 'text-white' : 'text-gray-600'}`}>
                        Created
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('completed')}
                    className={`flex-1 py-3 rounded-lg ${activeTab === 'completed' ? 'bg-black' : 'bg-transparent'}`}
                >
                    <Text className={`text-center font-semibold ${activeTab === 'completed' ? 'text-white' : 'text-gray-600'}`}>
                        Completed
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
                {activeTab === 'created'
                    ? createdTweaks.map(renderTweakCard)
                    : completedTweaks.map(renderTweakCard)
                }
            </ScrollView>
        </View>
    );
}
