import { Ionicons } from '@expo/vector-icons';
import { palette } from '@tweak/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '../../store/useNetworkStore';

export default function NoInternetBanner(): React.JSX.Element | null {
    const isConnected = useNetworkStore((state) => state.isConnected);
    const insets = useSafeAreaInsets();

    if (isConnected !== false) return null;

    return (
        <Animated.View
            entering={SlideInUp.duration(500)} // Smooth slide down
            exiting={SlideOutUp.duration(500)} // Smooth slide up
            style={[styles.container, { paddingTop: insets.top + 10 }]}
        >
            <View style={styles.content}>
                <Ionicons name="cloud-offline" size={20} color="white" />
                <Text style={styles.text}>No Internet Connection</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: palette.red500, // Red-500
        zIndex: 9999, // Highest z-index to sit on top of everything
        alignItems: 'center',
        paddingBottom: 12,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    text: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
