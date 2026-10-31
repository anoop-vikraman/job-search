import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { themeColors } from '../../themes/colors';

import { AddressCardProps } from '../../types/location';

export default function AddressCard({
    address,
    selected,
    onPress,
    onMenuPress,
    showMenuOption = false,
    isMenuOpen = false,
    onEdit,
    onDelete
}: AddressCardProps) {
    const iconName =
        address.saveAs?.toLowerCase() === 'home' ? 'home' :
            address.saveAs?.toLowerCase() === 'work' ? 'briefcase' :
                address.saveAs?.toLowerCase() === 'friends' ? 'people' : 'location';

    return (
        <View className="relative">
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                className={`flex-row items-center p-4 rounded-2xl mb-3 border ${selected ? 'border-primary' : 'border-gray-100 bg-white'}`}
                style={{
                    backgroundColor: selected ? themeColors.primary + '08' : 'white',
                    ...(!selected && {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3.84,
                        elevation: 2,
                    })
                }}
            >
                {/* Icon Box */}
                <View
                    className={`w-8 h-8 rounded-full items-center justify-center mr-4 ${selected ? 'bg-primary' : ''}`}
                    style={!selected ? { backgroundColor: themeColors.primary + '15' } : {}}
                >
                    <Ionicons
                        name={iconName}
                        size={16}
                        color={selected ? 'white' : themeColors.primary}
                    />
                </View>

                {/* Details */}
                <View className="flex-1">
                    <Text className={`font-bold text-[15px] mb-0.5 ${selected ? 'text-primary' : 'text-gray-900'}`}>
                        {address.saveAs}
                    </Text>
                    <Text className="text-gray-500 text-[11px] leading-[15px]" numberOfLines={2}>
                        {address.houseNo ? `${address.houseNo}, ` : ''}{address.area}, {address.city}, {address.state} - {address.pincode}
                    </Text>
                </View>

                {/* Edit / Menu */}
                {showMenuOption && onMenuPress && (
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            onMenuPress();
                        }}
                        className="p-2 -mr-2"
                        accessibilityRole="button"
                        accessibilityLabel="More options"
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color="gray" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>

            {/* Tooltip Menu */}
            {isMenuOpen && (
                <View
                    style={{
                        position: 'absolute',
                        right: 10,
                        top: 45,
                        backgroundColor: 'white',
                        borderRadius: 12,
                        padding: 8,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 10,
                        elevation: 5,
                        zIndex: 100,
                        flexDirection: 'row',
                        borderWidth: 1,
                        borderColor: '#F3F4F6'
                    }}
                >
                    <TouchableOpacity
                        onPress={onEdit}
                        className="flex-row items-center px-3 py-2"
                    >
                        <Ionicons name="pencil" size={16} color={themeColors.primary} />
                        <Text className="ml-2 text-primary font-bold text-sm">Edit</Text>
                    </TouchableOpacity>
                    <View className="w-[1px] h-full bg-gray-100 mx-1" />
                    <TouchableOpacity
                        onPress={onDelete}
                        className="flex-row items-center px-3 py-2"
                    >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text className="ml-2 text-red-500 font-bold text-sm">Delete</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
