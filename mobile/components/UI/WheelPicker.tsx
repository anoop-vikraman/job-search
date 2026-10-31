import { palette } from '@tweak/theme';
import React, { useEffect, useRef, useState } from 'react';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    ViewStyle
} from 'react-native';
import { themeColors } from '../../themes/colors';

interface WheelPickerProps {
    items: string[];
    selectedValue: string;
    onValueChange: (value: string) => void;
    itemHeight?: number;
    containerStyle?: ViewStyle;
    selectedItemStyle?: ViewStyle;
}

const ITEM_HEIGHT = 50;

export const WheelPicker = ({
    items,
    selectedValue,
    onValueChange,
    itemHeight = ITEM_HEIGHT,
    containerStyle,
}: WheelPickerProps): React.JSX.Element => {
    const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Initial scroll to selected value
    useEffect(() => {
        const index = items.indexOf(selectedValue);
        if (index >= 0) {
            setSelectedIndex(index);
            // Delay slightly to ensure layout is ready
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                    y: index * itemHeight,
                    animated: false,
                });
            }, 50); // Ensure minimal layout delay
        }
    }, [selectedValue, items, itemHeight]);

    const handleMomentumScrollEnd = (
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / itemHeight);

        // Clamp index
        const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

        if (items[clampedIndex] !== selectedValue) {
            setSelectedIndex(clampedIndex);
            onValueChange(items[clampedIndex]);
        }
    };

    return (
        <View style={[{ height: itemHeight * 3, overflow: 'hidden' }, containerStyle]}>
            {/* Selection Overlay (Center Highlight) */}
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: itemHeight,
                    left: 0,
                    right: 0,
                    height: itemHeight,
                    backgroundColor: themeColors.primary + '10', // 10% opacity primary
                    borderColor: themeColors.primary,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    zIndex: 10,
                }}
            />

            <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={itemHeight}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumScrollEnd}
                contentContainerStyle={{
                    paddingVertical: itemHeight, // Padding to allow first/last item to be centered
                }}
            >
                {items.map((item, index) => {
                    const isSelected = items.indexOf(selectedValue) === index;
                    return (
                        <TouchableOpacity
                            key={index}
                            style={{
                                height: itemHeight,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                            onPress={() => {
                                scrollViewRef.current?.scrollTo({
                                    y: index * itemHeight,
                                    animated: true,
                                });
                                onValueChange(item);
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: isSelected ? 20 : 16,
                                    fontWeight: isSelected ? 'bold' : 'normal',
                                    color: isSelected ? themeColors.primary : palette.gray400,
                                }}
                            >
                                {item}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};
