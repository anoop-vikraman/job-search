import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { themeColors } from '../../themes/colors';
import { Address } from '../../types/location';
import CustomConfirmationModal from '../UI/CustomConfirmationModal';
import AddressCard from './AddressCard';

interface AddressListViewProps {
    onSelect: (address: Address) => void;
    currentAddressId?: string;
    onAddAddress?: () => void;
    onEditAddress?: (address: Address) => void;
}

export default function AddressListView({
    onSelect,
    currentAddressId,
    onAddAddress,
    onEditAddress,
}: AddressListViewProps): React.JSX.Element {
    const { savedAddresses, removeAddress } = useAppStore();

    const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
    const [addressToDelete, setAddressToDelete] = React.useState<Address | null>(null);
    const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

    const handleEdit = (address: Address) => {
        if (onEditAddress) {
            onEditAddress(address);
        }
    };

    const handleDelete = (address: Address) => {
        setAddressToDelete(address);
        setDeleteModalVisible(true);
    };

    const confirmDelete = () => {
        if (addressToDelete) {
            removeAddress(addressToDelete.id);
            setDeleteModalVisible(false);
            setAddressToDelete(null);
        }
    };

    const toggleMenu = (addressId: string) => {
        setActiveMenuId(activeMenuId === addressId ? null : addressId);
    };

    return (
        <View className="flex-1">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-32"
            >
                {/* Saved Addresses */}
                {savedAddresses.length > 0 && (
                    <View>
                        <View className="flex-row items-center mb-6">
                            <View className="bg-primary/10 p-1.5 rounded-lg mr-2">
                                <Ionicons name="bookmark" size={12} color={themeColors.primary} />
                            </View>
                            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Your Saved Locations</Text>
                        </View>

                        {savedAddresses.map((addr) => (
                            <AddressCard
                                key={addr.id}
                                address={addr}
                                selected={addr.id === currentAddressId}
                                onPress={() => {
                                    if (activeMenuId) {
                                        setActiveMenuId(null);
                                    } else {
                                        onSelect(addr);
                                    }
                                }}
                                showMenuOption
                                onMenuPress={() => toggleMenu(addr.id)}
                                isMenuOpen={activeMenuId === addr.id}
                                onEdit={() => {
                                    handleEdit(addr);
                                    setActiveMenuId(null);
                                }}
                                onDelete={() => {
                                    handleDelete(addr);
                                    setActiveMenuId(null);
                                }}
                            />
                        ))}
                    </View>
                )}

                {/* Add New Address Button (Inline) */}
                {onAddAddress && (
                    <TouchableOpacity
                        onPress={onAddAddress}
                        className="flex-row items-center justify-center py-4 px-4 bg-purple-50 rounded-2xl border border-dashed border-purple-200 active:bg-purple-100 mb-6 mt-2"
                    >
                        <View className="bg-white p-1.5 rounded-full mr-3 shadow-sm">
                            <Ionicons name="add" size={20} color={themeColors.primary} />
                        </View>
                        <Text className="text-primary font-bold text-base">Add New Address</Text>
                    </TouchableOpacity>
                )}

                {/* Empty State */}
                {savedAddresses.length === 0 && (
                    <View className="items-center justify-center py-20">
                        <View className="bg-gray-50 p-8 rounded-[40px] mb-6">
                            <Ionicons name="location-outline" size={64} color="#ddd" />
                        </View>
                        <Text className="text-gray-900 font-bold text-lg mb-2">No addresses found</Text>
                        <Text className="text-gray-400 text-center px-10 text-sm leading-5">
                            You haven't saved any locations yet. Add a new address to get started!
                        </Text>
                    </View>
                )}
            </ScrollView>

            <CustomConfirmationModal
                visible={deleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                onConfirm={confirmDelete}
                title="Delete Address"
                message={`Are you sure you want to delete "${addressToDelete?.saveAs}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
            />
        </View>
    );
}
