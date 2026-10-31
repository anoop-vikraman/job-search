import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import CreateFlowHeader from '../../components/create-tweak/CreateFlowHeader';
import AddressListView from '../../components/Location/AddressListView';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useAppStore } from '../../store/useAppStore';
import { useCreateTweakStore } from '../../store/useCreateTweakStore';

export default function LocationEntryPage(): React.JSX.Element {
    const router = useRouter();
    const { setTweakType, setAddress, address: currentAddress } = useCreateTweakStore();
    const { savedAddresses } = useAppStore();
    const [selectedId, setSelectedId] = useState<string | undefined>(currentAddress?.id);

    const handleContinue = () => {
        const selectedAddr = savedAddresses.find(a => a.id === selectedId);
        if (selectedAddr) {
            setTweakType('in_person');
            setAddress(selectedAddr);
            router.push('/create-tweak/category');
        }
    };

    return (
        <ScreenWrapper>
            <CreateFlowHeader
                stepLabel="Select Location"
                progress={0.12}
                onBack={() => router.back()}
                hideAddress={true}
            />

            <View className="flex-1 px-8 py-8">
                <Text className="text-3xl font-bold text-gray-900 dark:text-slate-50 mb-2">Where is the tweak?</Text>
                <Text className="text-gray-500 dark:text-slate-400 mb-6">Choose a saved address or add a new one for your onsite tweak.</Text>

                <View className="flex-1">
                    <AddressListView
                        onSelect={(addr) => setSelectedId(addr.id)}
                        currentAddressId={selectedId}
                        onAddAddress={() => router.push('/create-tweak/select-location')}
                        onEditAddress={(addr) => {
                            router.push({
                                pathname: '/create-tweak/select-location',
                                params: { editAddress: JSON.stringify(addr) }
                            });
                        }}
                    />
                </View>
            </View>

            {/* Continue Button Fixed at Bottom */}
            <View className="p-6 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700" style={{ paddingBottom: 40 }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={!selectedId}
                    onPress={handleContinue}
                    className={`flex-row items-center justify-center h-16 rounded-2xl shadow-xl ${selectedId ? 'bg-primary shadow-primary/30' : 'bg-gray-300'}`}
                >
                    <Text className="text-white font-bold text-lg">Continue</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}
