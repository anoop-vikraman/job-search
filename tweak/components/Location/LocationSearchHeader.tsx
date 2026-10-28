import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

import { LocationSearchHeaderProps } from '../../types/location';

export default function LocationSearchHeader({ onSearch }: LocationSearchHeaderProps) {
    const router = useRouter();
    const [query, setQuery] = React.useState('');

    return (
        <>
            {/* Map Header / Back Button Overlay */}
            <View className="absolute top-12 left-4 z-10">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="bg-white p-2 rounded-full shadow-md"
                >
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
            </View>

            {/* Search Bar Overlay */}
            <View className="absolute top-12 left-16 right-4 z-10">
                <View className="bg-white flex-row items-center px-4 py-3 rounded-xl shadow-lg border border-gray-100">
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        className="ml-2 flex-1 text-base py-0"
                        placeholder="Search an area or address"
                        placeholderTextColor="#9CA3AF"
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => onSearch(query)}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => { setQuery(''); onSearch(''); }}>
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </>
    );
}
