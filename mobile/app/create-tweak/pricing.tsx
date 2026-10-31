import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CreateFlowHeader from '../../components/create-tweak/CreateFlowHeader';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CustomButton from '../../components/UI/CustomButton';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import { PricingModel, useCreateTweakStore } from '../../store/useCreateTweakStore';

interface PricingCardProps {
    title: string;
    description: string;
    isSelected: boolean;
    onSelect: () => void;
    icon: any;
    color: string;
    children?: React.ReactNode;
}

const PricingCard: React.FC<PricingCardProps> = ({ title, description, isSelected, onSelect, icon, color, children }) => {
    return (
        <TouchableOpacity
            onPress={onSelect}
            activeOpacity={0.9}
            className={`p-5 rounded-2xl border mb-4 bg-white shadow-sm transition-all duration-200 ${isSelected ? 'border-primary bg-blue-50/50 pb-2' : 'border-gray-200'
                }`}
        >
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1 mr-4">
                    <View className={`w-12 h-12 rounded-full items-center justify-center mr-4`} style={{ backgroundColor: `${color}15` }}>
                        <Ionicons name={icon} size={24} color={color} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900 mb-1">{title}</Text>
                        <Text className="text-gray-500 text-sm leading-5">{description}</Text>
                    </View>
                </View>

                {/* Circle Checkmark Selection */}
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                    }`}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
            </View>

            {isSelected && children && (
                <View className="mt-4 pt-4 border-t border-gray-200/50">
                    {children}
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function PricingDetailsPage() {
    const router = useRouter();
    const { pricingModel, pricingData, setPricingModel, setPricingData, isEditMode } = useCreateTweakStore();
    const confirm = useConfirmationStore(state => state.confirm);

    // Local state for all fields
    const [hourlyRate, setHourlyRate] = useState('');

    // Quantity fields
    const [quantityName, setQuantityName] = useState('');
    const [quantityCount, setQuantityCount] = useState('1');
    const [quantityPricePerItem, setQuantityPricePerItem] = useState('');

    // Fixed price field
    const [fixedPrice, setFixedPrice] = useState('');

    const [hasPriceInMind, setHasPriceInMind] = useState<boolean | null>(null);

    const [showValidation, setShowValidation] = useState(false);

    // Load existing data on mount
    useEffect(() => {
        if (!pricingModel) {
            setPricingModel('quote');
            setHasPriceInMind(false);
        } else {
            setHasPriceInMind(pricingModel !== 'quote');
        }

        if (pricingModel === 'hourly' && pricingData?.price) {
            setHourlyRate(pricingData.price.toString());
        } else if (pricingModel === 'quantity' && pricingData) {
            setQuantityName(pricingData.itemName || '');
            setQuantityCount(pricingData.quantity?.toString() || '1');
            setQuantityPricePerItem(pricingData.pricePerItem?.toString() || '');
        } else if (pricingModel === 'fixed' && pricingData?.price) {
            setFixedPrice(pricingData.price.toString());
        }
    }, []);

    const handleSelectModel = (model: PricingModel) => {
        setPricingModel(model);
        setShowValidation(false);
        // Clear other fields when switching
        if (model === 'hourly') {
            setQuantityName('');
            setQuantityCount('1');
            setQuantityPricePerItem('');
            setFixedPrice('');
        } else if (model === 'quantity') {
            setHourlyRate('');
            setFixedPrice('');
        } else if (model === 'fixed') {
            setHourlyRate('');
            setQuantityName('');
            setQuantityCount('1');
            setQuantityPricePerItem('');
        }
    };

    const handleContinue = () => {
        setShowValidation(true);
        if (hasPriceInMind === null) {
            return;
        }

        if (pricingModel === 'quote' || hasPriceInMind === false) {
            setPricingData(null);
            setPricingModel('quote');
        } else if (pricingModel === 'hourly') {
            if (!hourlyRate) {
                return;
            }
            setPricingData({ price: parseFloat(hourlyRate) });
        } else if (pricingModel === 'quantity') {
            if (!quantityName || !quantityCount || parseInt(quantityCount) <= 0 || !quantityPricePerItem || parseFloat(quantityPricePerItem) <= 0) {
                return;
            }
            setPricingData({
                itemName: quantityName,
                quantity: parseInt(quantityCount),
                pricePerItem: parseFloat(quantityPricePerItem),
                totalPrice: parseInt(quantityCount) * parseFloat(quantityPricePerItem)
            });
        } else if (pricingModel === 'fixed') {
            if (!fixedPrice) {
                return;
            }
            setPricingData({ price: parseFloat(fixedPrice) });
        }

        // Navigate back to edit if in edit mode, otherwise continue to preview
        if (isEditMode) {
            router.back();
        } else {
            router.push('/create-tweak/preview');
        }
    };

    const calculateQuantityTotal = () => {
        const count = parseInt(quantityCount) || 0;
        const price = parseFloat(quantityPricePerItem) || 0;
        return (count * price).toFixed(2);
    };

    return (
        <ScreenWrapper>
            {/* Header */}
            <CreateFlowHeader
                stepLabel="Tweak Pricing"
                progress={0.88}
            />

            <View className="px-6 py-6 border-b border-gray-100 bg-white">
                <Text className="text-3xl font-bold text-gray-900 mb-2">How would you like to pay?</Text>
                <Text className="text-gray-500">Choose the pricing structure that fits best.</Text>
                {showValidation && hasPriceInMind === null && (
                    <View className="bg-red-50 p-3 rounded-xl border border-red-100 mt-4 flex-row items-center">
                        <Ionicons name="alert-circle" size={18} color="#EF4444" />
                        <Text className="text-red-600 font-bold ml-2 text-sm">Please select an option below</Text>
                    </View>
                )}
            </View>
            <ScrollView className="flex-1 p-6 bg-gray-50">

                {/* Price Inquiry Question */}
                <View className="mb-8">
                    <Text className="text-xl font-bold text-gray-800 mb-4">Do you have a price in mind?</Text>
                    <View className="flex-row gap-4">
                        <TouchableOpacity
                            onPress={() => setHasPriceInMind(true)}
                            activeOpacity={0.7}
                            className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl border-2 transition-all ${hasPriceInMind === true
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 bg-white'
                                }`}
                        >
                            <Ionicons
                                name={hasPriceInMind === true ? "checkmark-circle" : "ellipse-outline"}
                                size={22}
                                color={hasPriceInMind === true ? "#01C39D" : "#9CA3AF"}
                                className="mr-2"
                            />
                            <Text className={`font-bold text-lg ${hasPriceInMind === true ? 'text-primary' : 'text-gray-500'}`}>Yes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setHasPriceInMind(false);
                                handleSelectModel('quote');
                            }}
                            activeOpacity={0.7}
                            className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl border-2 transition-all ${hasPriceInMind === false
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 bg-white'
                                }`}
                        >
                            <Ionicons
                                name={hasPriceInMind === false ? "checkmark-circle" : "ellipse-outline"}
                                size={22}
                                color={hasPriceInMind === false ? "#01C39D" : "#9CA3AF"}
                                className="mr-2"
                            />
                            <Text className={`font-bold text-lg ${hasPriceInMind === false ? 'text-primary' : 'text-gray-500'}`}>No</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {hasPriceInMind === false && (
                    <View className="bg-white p-8 rounded-[32px] border border-primary/20 shadow-xl shadow-primary/10 items-center overflow-hidden">
                        <View className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full" />
                        <View className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full" />

                        <View className="w-20 h-20 bg-primary/10 rounded-3xl items-center justify-center mb-6 rotate-3">
                            <Ionicons name="sparkles" size={40} color="#01C39D" />
                        </View>

                        <Text className="text-2xl font-black text-gray-900 text-center leading-tight mb-4 px-2">
                            The applicants could <Text className="text-primary italic">Quote</Text> a price!
                        </Text>

                        <View className="h-1 w-12 bg-primary/20 rounded-full mb-6" />

                        <Text className="text-gray-500 text-center text-lg leading-relaxed px-4 font-medium">
                            The applicants will be able to propose a price and you will be able to choose from that.
                        </Text>
                    </View>
                )}

                {hasPriceInMind === true && (
                    <View>
                        {/* Hourly Pricing Card */}
                        <PricingCard
                            title="Per Hour"
                            description="Pay based on the time spent on the task."
                            icon="time"
                            color="#3B82F6"
                            isSelected={pricingModel === 'hourly'}
                            onSelect={() => handleSelectModel('hourly')}
                        >
                            <View>
                                <Text className="font-bold text-gray-700 mb-2">Hourly Rate</Text>
                                <View className={`bg-white border rounded-xl px-4 flex-row items-center h-14 ${showValidation && !hourlyRate ? 'border-red-500' : 'border-gray-200'}`}>
                                    <Text className="text-gray-500 mr-2 text-lg">₹</Text>
                                    <TextInput
                                        value={hourlyRate}
                                        onChangeText={(t) => {
                                            setHourlyRate(t);
                                            setShowValidation(false);
                                        }}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        className="flex-1 text-lg font-bold text-gray-900"
                                    />
                                    <Text className="text-gray-500 ml-2">/ hr</Text>
                                </View>
                                {showValidation && !hourlyRate && (
                                    <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">Please enter an hourly rate</Text>
                                )}
                            </View>
                        </PricingCard>

                        {/* Per Quantity Pricing Card */}
                        <PricingCard
                            title="Per Quantity"
                            description="Pay based on the number of items (e.g., 5 boxes moved)."
                            icon="copy"
                            color="#10B981"
                            isSelected={pricingModel === 'quantity'}
                            onSelect={() => handleSelectModel('quantity')}
                        >
                            <View className="gap-4">
                                <View>
                                    <Text className="font-bold text-gray-700 mb-2">Item Name</Text>
                                    <TextInput
                                        value={quantityName}
                                        onChangeText={(t) => {
                                            setQuantityName(t);
                                            setShowValidation(false);
                                        }}
                                        placeholder="e.g. Room, Logo, Page"
                                        className={`bg-white border rounded-xl px-4 h-14 text-lg text-gray-900 ${showValidation && !quantityName ? 'border-red-500' : 'border-gray-200'}`}
                                    />
                                    {showValidation && !quantityName && (
                                        <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">Please enter item name</Text>
                                    )}
                                </View>

                                <View className="flex-row gap-4">
                                    <View className="flex-1">
                                        <Text className="font-bold text-gray-700 mb-2">Quantity</Text>
                                        <TextInput
                                            value={quantityCount}
                                            onChangeText={(t) => {
                                                setQuantityCount(t);
                                                setShowValidation(false);
                                            }}
                                            placeholder="1"
                                            keyboardType="numeric"
                                            className={`bg-white border rounded-xl px-4 h-14 text-lg font-bold text-center text-gray-900 ${showValidation && (!quantityCount || parseInt(quantityCount) <= 0) ? 'border-red-500' : 'border-gray-200'}`}
                                        />
                                        {showValidation && (!quantityCount || parseInt(quantityCount) <= 0) && (
                                            <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">{!quantityCount ? 'Required' : 'Min 1'}</Text>
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-gray-700 mb-2">Price / Item</Text>
                                        <View className={`bg-white border rounded-xl px-4 flex-row items-center h-14 ${showValidation && !quantityPricePerItem ? 'border-red-500' : 'border-gray-200'}`}>
                                            <Text className="text-gray-500 mr-1 text-lg">₹</Text>
                                            <TextInput
                                                value={quantityPricePerItem}
                                                onChangeText={(t) => {
                                                    setQuantityPricePerItem(t);
                                                    setShowValidation(false);
                                                }}
                                                placeholder="0"
                                                keyboardType="numeric"
                                                className="flex-1 text-lg font-bold text-gray-900"
                                            />
                                        </View>
                                        {showValidation && !quantityPricePerItem && (
                                            <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">Required</Text>
                                        )}
                                    </View>
                                </View>

                                <View className="bg-gray-100 p-4 rounded-xl flex-row justify-between items-center mt-2">
                                    <Text className="font-medium text-gray-600">Total Amount:</Text>
                                    <Text className="font-bold text-xl text-primary">₹ {calculateQuantityTotal()}</Text>
                                </View>
                            </View>
                        </PricingCard>

                        {/* Fixed Price Pricing Card */}
                        <PricingCard
                            title="Fixed Price"
                            description="One flat fee for the entire job."
                            icon="pricetag"
                            color="#8B5CF6"
                            isSelected={pricingModel === 'fixed'}
                            onSelect={() => handleSelectModel('fixed')}
                        >
                            <View>
                                <Text className="font-bold text-gray-700 mb-2">Total Amount</Text>
                                <View className={`bg-white border rounded-xl px-4 flex-row items-center h-14 ${showValidation && !fixedPrice ? 'border-red-500' : 'border-gray-200'}`}>
                                    <Text className="text-gray-500 mr-2 text-lg">₹</Text>
                                    <TextInput
                                        value={fixedPrice}
                                        onChangeText={(t) => {
                                            setFixedPrice(t);
                                            setShowValidation(false);
                                        }}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        className="flex-1 text-lg font-bold text-gray-900"
                                    />
                                </View>
                                {showValidation && !fixedPrice && (
                                    <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">Please enter a fixed total amount</Text>
                                )}
                            </View>
                        </PricingCard>
                    </View>
                )}

                {/* Spacer for bottom button visibility */}
                <View className="h-20" />
            </ScrollView>

            <View className="p-6 border-t border-gray-100 bg-white">
                <CustomButton onPress={handleContinue}>Review Tweak</CustomButton>
            </View>
        </ScreenWrapper>
    );
}
