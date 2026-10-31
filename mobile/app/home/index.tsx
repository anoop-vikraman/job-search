import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import HomeHeader from '../../components/Home/HomeHeader';
import PromoBanner from '../../components/Home/PromoBanner';
import SecondaryPromo from '../../components/Home/SecondaryPromo';
import ServiceGrid from '../../components/Home/ServiceGrid';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useAppStore } from '../../store/useAppStore';

export default function Home() {
    const router = useRouter();
    const savedAddresses = useAppStore((state) => state.savedAddresses);
    const address = savedAddresses[0]?.formattedAddress ?? 'Set your location';

    const handleLocationPress = () => {
        router.push('/create-tweak/select-location');
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
