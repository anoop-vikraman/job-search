import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, View } from 'react-native';
import { palette } from '@tweak/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_ASPECT_RATIO = 16 / 9; // Adjust as needed
const BANNER_HEIGHT = 180;

const MOCK_BANNERS = [
    { id: '1', color: palette.indigo600, title: 'Banner 1' },
    { id: '2', color: palette.green600, title: 'Banner 2' },
    { id: '3', color: palette.amber500, title: 'Banner 3' },
];

export default function PromoBanner() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if (currentIndex < MOCK_BANNERS.length - 1) {
                flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
                setCurrentIndex(currentIndex + 1);
            } else {
                flatListRef.current?.scrollToIndex({ index: 0, animated: true });
                setCurrentIndex(0);
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [currentIndex]);

    const renderItem = ({ item }: { item: typeof MOCK_BANNERS[0] }) => (
        <View style={{ width: SCREEN_WIDTH - 48, height: BANNER_HEIGHT, backgroundColor: item.color }} className="rounded-2xl mr-4 overflow-hidden shadow-sm items-center justify-center">
            {/* Replace with Image later */}
            {/* <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" /> */}
        </View>
    );

    return (
        <View className="mb-6">
            <FlatList
                ref={flatListRef}
                data={MOCK_BANNERS}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled={false} // Since we have margin, paging might be tricky. Using snapToInterval instead usually works better for cards with margins.
                snapToInterval={SCREEN_WIDTH - 48 + 16} // Item width + margin
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 24 }}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 48 + 16));
                    setCurrentIndex(index);
                }}
            />
            {/* Dots */}
            <View className="flex-row justify-center mt-3 gap-2">
                {MOCK_BANNERS.map((_, index) => (
                    <View
                        key={index}
                        className={`h-2 rounded-full ${currentIndex === index ? 'w-6 bg-orange-500' : 'w-2 bg-gray-300'}`}
                    />
                ))}
            </View>
        </View>
    );
}
