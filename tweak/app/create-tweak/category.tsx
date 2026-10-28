import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CreateFlowHeader from '../../components/create-tweak/CreateFlowHeader';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { CATEGORIES } from '../../constants/categories';
import { useCreateTweakStore } from '../../store/useCreateTweakStore';
import { themeColors } from '../../themes/colors';

export default function CategoryPage() {
    const router = useRouter();
    const { setCategory, setSuggestedCategory } = useCreateTweakStore();

    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    const [otherCategory, setOtherCategory] = useState('');
    const [showOtherError, setShowOtherError] = useState(false);

    const filteredCategories = CATEGORIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleContinue = () => {
        if (!selected) return;

        if (selected === 'Others') {
            if (!otherCategory.trim()) {
                setShowOtherError(true);
                return;
            }
            setSuggestedCategory(otherCategory);
        } else {
            setSuggestedCategory(null);
        }

        setCategory(selected);
        router.push('/create-tweak/details');
    };

    return (
        <ScreenWrapper>
            <CreateFlowHeader
                stepLabel="Select category"
                progress={0.25}
            />

            <View className="flex-1 bg-white">
                {/* Search */}
                <View className="px-6 py-4">
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 border border-transparent focus:border-gray-300">
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            placeholder="Search categories..."
                            value={search}
                            onChangeText={setSearch}
                            className="flex-1 ml-3 text-base text-gray-900"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Grid */}
                <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 20 }}>
                    <View className="flex-row flex-wrap justify-between">
                        {filteredCategories.map((cat) => {
                            const isSelected = selected === cat.name;
                            return (
                                <TouchableOpacity
                                    key={cat.name}
                                    onPress={() => {
                                        setSelected(cat.name);
                                        if (cat.name !== 'Others') setOtherCategory('');
                                    }}
                                    className={`w-[48%] mb-3 p-4 rounded-2xl border items-center justify-center h-32 ${isSelected
                                        ? 'bg-blue-50 border-primary'
                                        : 'bg-white border-gray-100 shadow-sm'
                                        }`}
                                >
                                    <View className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${isSelected ? 'bg-blue-100' : 'bg-gray-50'
                                        }`}>
                                        <Ionicons
                                            name={cat.icon as any}
                                            size={20}
                                            color={isSelected ? themeColors.primary : '#4B5563'}
                                        />
                                    </View>
                                    <Text className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-gray-900'
                                        }`}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            {/* Bottom Sheet for "Other" */}
            {selected === 'Others' && (
                <View className="absolute bottom-0 left-0 right-0 bg-white p-6 rounded-t-3xl shadow-2xl border-t border-gray-100 z-10">
                    <Text className="text-lg font-bold text-gray-900 mb-2">Suggest a new category</Text>
                    <View className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex-row items-start mb-4">
                        <Ionicons name="alert-circle" size={20} color="#EAB308" style={{ marginTop: 2 }} />
                        <Text className="text-yellow-800 ml-2 flex-1 text-sm">
                            Your suggestion will be reviewed. Until approved, your tweak will be listed under "Other".
                        </Text>
                    </View>

                    <TextInput
                        placeholder="Type category name..."
                        value={otherCategory}
                        onChangeText={(text) => {
                            setOtherCategory(text);
                            if (showOtherError) setShowOtherError(false);
                        }}
                        className={`bg-gray-50 border rounded-xl px-4 py-3 text-base mb-2 ${showOtherError ? 'border-red-500' : 'border-gray-200'}`}
                        autoFocus
                    />
                    {showOtherError && (
                        <Text className="text-red-500 text-xs mb-4 ml-1">Please enter a category name</Text>
                    )}

                    <TouchableOpacity
                        onPress={handleContinue}
                        className="py-4 rounded-xl items-center justify-center bg-primary"
                    >
                        <Text className="text-white font-bold text-lg">Confirm</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Standard Footer if not Other */}
            {selected && selected !== 'Others' && (
                <View className="px-6 py-3 border-t border-gray-100 bg-white">
                    <TouchableOpacity
                        onPress={handleContinue}
                        className="bg-primary py-4 rounded-xl items-center justify-center flex-row shadow-lg shadow-primary/30"
                    >
                        <Text className="text-white font-bold text-lg mr-2">Continue</Text>
                        {/* <Ionicons name="arrow-forward" size={20} color="white" /> */}
                    </TouchableOpacity>
                </View>
            )}
        </ScreenWrapper>
    );
}
