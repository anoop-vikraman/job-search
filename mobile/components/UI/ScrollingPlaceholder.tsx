import { palette } from '@tweak/theme';
import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
    FadeInUp,
    FadeOutUp
} from 'react-native-reanimated';

interface Props {
    placeholders: string[];
    duration?: number;
    textStyle?: StyleProp<TextStyle>;
    containerStyle?: StyleProp<ViewStyle>;
}

export default function ScrollingPlaceholder({
    placeholders,
    duration = 3000,
    textStyle,
    containerStyle
}: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % placeholders.length);
        }, duration);

        return () => clearInterval(interval);
    }, [placeholders.length, duration]);

    return (
        <View style={[styles.container, containerStyle]} pointerEvents="none">
            <Animated.View
                key={currentIndex} // Force re-mount for enter/exit animation
                entering={FadeInUp.duration(400)}
                exiting={FadeOutUp.duration(400)}
            >
                <Text style={[styles.text, textStyle]} numberOfLines={1}>
                    {placeholders[currentIndex]}
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        justifyContent: 'center',
    },
    text: {
        color: palette.gray400,
        fontSize: 16,
    }
});
