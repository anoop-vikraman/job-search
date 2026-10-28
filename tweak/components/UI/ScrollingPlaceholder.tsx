import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    FadeInUp,
    FadeOutUp
} from 'react-native-reanimated';

interface Props {
    placeholders: string[];
    duration?: number;
    textStyle?: any;
    containerStyle?: any;
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
        color: '#9CA3AF',
        fontSize: 16,
    }
});
