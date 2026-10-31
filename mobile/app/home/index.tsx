import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import HomeHeader from '../../components/Home/HomeHeader';
import PromoBanner from '../../components/Home/PromoBanner';
import SecondaryPromo from '../../components/Home/SecondaryPromo';
import ServiceGrid from '../../components/Home/ServiceGrid';
import { ScreenWrapper } from '../../components/ScreenWrapper';

// Mock Location Data
// In a real app, use a Context or Hook to get this
const MOCK_ADDRESS = "Sukumar, Gnra 3, Santhi Nagar...";

export default function Home() {
    const router = useRouter();
    const [address, setAddress] = useState(MOCK_ADDRESS);

    const handleLocationPress = () => {
        // Open Location Modal or navigate to address selection
        console.log("Location Pressed");
    };

    return (
        <ScreenWrapper scrollable={false}>
            <HomeHeader
                currentAddress={address}
                onLocationPress={handleLocationPress}
            />

            <ScrollView
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
                showsVerticalScrollIndicator={false}
            >
                <PromoBanner />

                <ServiceGrid />

                <SecondaryPromo />

                {/* Additional Promo / Content can go here */}
                <View className="px-6 mb-8">
                    <View className="bg-gray-50 h-[200px] rounded-3xl items-center justify-center border border-gray-100 border-dashed">
                        <Text className="text-gray-400 font-medium">More Content Coming Soon</Text>
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}
// Wait, nesting ScreenWrapper inside ScreenWrapper might be bad if both handle SafeArea.
// Let's check ScreenWrapper implementation first.
