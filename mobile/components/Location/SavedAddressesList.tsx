import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { palette } from '@tweak/theme';
import { useAppStore } from '../../store/useAppStore';
import { themeColors } from '../../themes/colors';
import { SavedAddressesListProps } from '../../types/location';
import AddressListView from './AddressListView';

export default function SavedAddressesList({
    visible,
    onClose,
    onSelect,
    currentAddressId
}: SavedAddressesListProps): React.JSX.Element {
    const router = useRouter();
    const { savedAddresses, removeAddress } = useAppStore();
    const [selectedId, setSelectedId] = useState<string | undefined>(currentAddressId);

    useEffect(() => {
        if (visible) {
            setSelectedId(currentAddressId);
        }
    }, [currentAddressId, visible]);



    return (
        <>
            <Modal
                animationType="slide"
                transparent={true}
                visible={visible}
                onRequestClose={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onClose}
                    className="flex-1 justify-end bg-black/40"
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        className="bg-white rounded-t-[40px] h-[75%] shadow-2xl"
                    >
                        {/* Header */}
                        <View className="px-6 py-4 flex-row items-center justify-center border-b border-gray-100 bg-white relative">
                            <TouchableOpacity
                                onPress={onClose}
                                className="absolute left-4 p-2 rounded-full active:bg-gray-100"
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                            >
                                <Ionicons name="close" size={24} color={palette.gray900} />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold text-gray-900">Select Location</Text>
                        </View>

                        <View className="px-8 pt-8">
                            <Text className="text-3xl font-bold text-gray-900 mb-2">Where is the tweak?</Text>
                            <Text className="text-gray-500 mb-2">Choose a saved address or add a new one for your onsite tweak.</Text>
                        </View>

                        <View className="flex-1 px-8 py-4">
                            <AddressListView
                                onSelect={(addr) => setSelectedId(addr.id)}
                                currentAddressId={selectedId}
                                onAddAddress={() => {
                                    onClose();
                                    router.push('/create-tweak/select-location');
                                }}
                                onEditAddress={(addr) => {
                                    onClose();
                                    router.push({
                                        pathname: '/create-tweak/select-location',
                                        params: { editAddress: JSON.stringify(addr) }
                                    });
                                }}
                            />
                        </View>

                        {/* Add New Button Fixed at Bottom */}
                        <View className="absolute bottom-0 w-full p-8 bg-white/95 border-t border-gray-100" style={{ paddingBottom: 40 }}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                disabled={!selectedId}
                                onPress={() => {
                                    const addr = savedAddresses.find(a => a.id === selectedId);
                                    if (addr) {
                                        onSelect(addr);
                                        onClose();
                                    }
                                }}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    height: 64,
                                    borderRadius: 16,
                                    backgroundColor: selectedId ? themeColors.primary : palette.gray300,
                                    ...(selectedId && {
                                        elevation: 8,
                                        shadowColor: themeColors.primary,
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8
                                    })
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>


        </>
    );
}
