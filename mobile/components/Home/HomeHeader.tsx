import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { palette } from '@tweak/theme';

interface HomeHeaderProps {
    currentAddress?: string;
    onLocationPress?: () => void;
}

export default function HomeHeader({ currentAddress = "Select Location", onLocationPress }: HomeHeaderProps): React.JSX.Element {
    const router = useRouter();

    return (
        <View className="px-4 pt-2 pb-4 bg-white shadow-sm z-10">
            {/* Top Row: Location, Wallet, and Profile */}
            <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity
                    className="flex-row items-center flex-1 mr-2"
                    onPress={onLocationPress}
                >
                    <View className="p-2 bg-orange-100 rounded-full mr-3">
                        <Ionicons name="navigate" size={20} color={palette.orange500} />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text className="font-bold text-lg text-gray-900 mr-1">Home</Text>
                            <Ionicons name="chevron-down" size={16} color={palette.gray700} />
                        </View>
                        <Text numberOfLines={1} className="text-gray-500 text-sm">
                            {currentAddress}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Wallet Balance */}
                <TouchableOpacity
                    onPress={() => router.push('/wallet')}
                    className="flex-row items-center bg-green-50 px-3 py-2 rounded-full mr-2 border border-green-200"
                >
                    <Ionicons name="wallet" size={16} color={palette.green600} />
                    <Text className="ml-1 font-bold text-green-700 text-sm">₹2,450</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/profile')}
                    className="p-2 bg-gray-100 rounded-full"
                    accessibilityRole="button"
                    accessibilityLabel="Open profile"
                >
                    <Ionicons name="person" size={24} color={palette.gray700} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 border border-gray-200">
                <Ionicons name="search" size={20} color={palette.gray400} />
                <TextInput
                    placeholder="Search for Services"
                    placeholderTextColor={palette.gray400}
                    className="flex-1 ml-3 text-base text-gray-900"
                    editable={false} // Make it clickable if navigating to a search page
                // onPressIn={() => router.push('/search')} 
                />
                <View className="h-5 w-[1px] bg-gray-300 mx-2" />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voice search">
                    <Ionicons name="mic" size={20} color={palette.orange500} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
