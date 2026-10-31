import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useCreateTweakStore } from '../../store/useCreateTweakStore';

export default function ServiceGrid() {
    const router = useRouter();
    const { setTweakType, reset } = useCreateTweakStore();

    const handleCreateTweak = (type: 'remote' | 'in_person') => {
        reset();
        setTweakType(type);
        if (type === 'in_person') {
            router.push('/create-tweak/location-entry');
        } else {
            router.push('/create-tweak/category');
        }
    };

    return (
        <View className="px-6 mb-8">
            <Text className="text-gray-900 font-bold text-lg mb-4 tracking-wider text-center">WHAT WOULD YOU LIKE TO DO?</Text>

            <View className="flex-row gap-4 mb-4">
                {/* Create Remote Tweak */}
                <TouchableOpacity
                    onPress={() => handleCreateTweak('remote')}
                    className="flex-1 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 min-h-[160px] justify-between"
                >
                    <View className="bg-blue-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                        <Ionicons name="laptop-outline" size={24} color="#3B82F6" />
                    </View>
                    <View>
                        <Text className="text-xl font-bold text-gray-900 leading-6 mb-1">Remote{'\n'}Tweak</Text>
                        <Text className="text-xs text-gray-500">Work from anywhere</Text>
                    </View>
                </TouchableOpacity>

                {/* Create On-site Tweak */}
                <TouchableOpacity
                    onPress={() => handleCreateTweak('in_person')}
                    className="flex-1 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 min-h-[160px] justify-between"
                >
                    <View className="bg-orange-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                        <Ionicons name="location" size={24} color="#F97316" />
                    </View>
                    <View>
                        <Text className="text-xl font-bold text-gray-900 leading-6 mb-1">On-site{'\n'}Tweak</Text>
                        <Text className="text-xs text-gray-500">Physical presence</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View className="flex-row gap-4">
                {/* Apply for Tweaks */}
                <TouchableOpacity
                    onPress={() => router.push('/apply')}
                    className="flex-1 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 min-h-[160px] justify-between"
                >
                    <View className="bg-purple-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                        <Ionicons name="search" size={24} color="#9333EA" />
                    </View>
                    <View>
                        <Text className="text-lg font-bold text-gray-900 leading-5 mb-1">Apply for{'\n'}Tweaks</Text>
                        <Text className="text-xs text-gray-500">Find gigs</Text>
                    </View>
                </TouchableOpacity>

                {/* Permanent Jobs */}
                <TouchableOpacity
                    onPress={() => router.push('/jobs')}
                    className="flex-1 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 min-h-[160px] justify-between"
                >
                    <View className="bg-green-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                        <Ionicons name="briefcase" size={24} color="#10B981" />
                    </View>
                    <View>
                        <Text className="text-lg font-bold text-gray-900 leading-5 mb-1">Permanent{'\n'}Jobs</Text>
                        <Text className="text-xs text-gray-500">Full-time</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}
