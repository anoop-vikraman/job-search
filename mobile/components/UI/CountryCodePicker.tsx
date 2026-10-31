import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import countryCodes from '../../constants/countryCodes.json';
import { themeColors } from '../../themes/colors';

interface Props {
    selectedCode: string;
    onSelect: (code: string) => void;
    disabled?: boolean;
}

export default function CountryCodePicker({ selectedCode, onSelect, disabled = false }: Props) {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');

    const filteredCountries = countryCodes.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial_code.includes(search)
    );

    return (
        <>
            <TouchableOpacity
                onPress={() => !disabled && setVisible(true)}
                className="flex-row items-center justify-center p-2 mr-2"
                style={{ opacity: disabled ? 0.6 : 1 }}
                disabled={disabled}
            >
                <Text className="text-base text-gray-900 font-medium mr-1">{selectedCode}</Text>
                {!disabled && <Ionicons name="chevron-down" size={16} color="#666" />}
            </TouchableOpacity>

            <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white pt-4">
                    <View className="flex-row justify-between items-center px-4 mb-4">
                        <Text className="text-xl font-bold text-gray-900">Select Country Code</Text>
                        <TouchableOpacity onPress={() => setVisible(false)} className="p-2">
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <View className="px-4 mb-4">
                        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                            <Ionicons name="search" size={20} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-3 text-base text-gray-900"
                                placeholder="Search country or code"
                                value={search}
                                onChangeText={setSearch}
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>

                    <FlatList
                        data={filteredCountries}
                        keyExtractor={(item) => item.code}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100"
                                onPress={() => {
                                    onSelect(item.dial_code);
                                    setVisible(false);
                                }}
                            >
                                <View className="flex-row items-center">
                                    <Text className="text-2xl mr-4">{item.code.replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))}</Text>
                                    <View>
                                        <Text className="text-base font-medium text-gray-900">{item.name}</Text>
                                        <Text className="text-sm text-gray-500">{item.code}</Text>
                                    </View>
                                </View>
                                <Text className={`text-base font-bold ${selectedCode === item.dial_code ? 'text-primary' : 'text-gray-500'}`}
                                    style={{ color: selectedCode === item.dial_code ? themeColors.primary : '#6B7280' }}
                                >
                                    {item.dial_code}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </>
    );
}
