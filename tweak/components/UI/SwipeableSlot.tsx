import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolate,
    interpolate,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface SwipeableSlotProps {
    children: React.ReactNode;
    onDelete: () => void;
}

const DELETE_THRESHOLD = -70;
const HAPTIC_TRIGGER_THRESHOLD = -35;
// Minimum upward movement needed before we "lock in" to vertical swipe mode
const DIRECTION_LOCK_THRESHOLD = 8;

export const SwipeableSlot: React.FC<SwipeableSlotProps> = ({ children, onDelete }) => {
    const translateY = useSharedValue(0);
    const hasTriggeredHaptic = useSharedValue(false);
    const isDismissing = useSharedValue(false);
    // 0 = undecided, 1 = vertical (ours), -1 = horizontal (pass to scroll)
    const lockedDirection = useSharedValue(0);

    const handleDelete = () => {
        onDelete();
    };

    const gesture = Gesture.Pan()
        .onBegin(() => {
            lockedDirection.value = 0;
        })
        .onUpdate((event) => {
            if (isDismissing.value) return;

            const { translationX, translationY } = event;
            const absX = Math.abs(translationX);
            const absY = Math.abs(translationY);

            // Determine direction lock on first significant movement
            if (lockedDirection.value === 0) {
                const totalMovement = Math.sqrt(absX * absX + absY * absY);
                if (totalMovement < DIRECTION_LOCK_THRESHOLD) return;

                // Only lock vertical if moving significantly more up than sideways
                if (translationY < 0 && absY > absX * 1.5) {
                    lockedDirection.value = 1; // vertical — we handle it
                } else {
                    lockedDirection.value = -1; // horizontal — defer to scroll
                }
            }

            if (lockedDirection.value !== 1) return;

            // Only respond to upward movement
            if (translationY < 0) {
                translateY.value = translationY;

                if (translationY < HAPTIC_TRIGGER_THRESHOLD && !hasTriggeredHaptic.value) {
                    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
                    hasTriggeredHaptic.value = true;
                } else if (translationY > HAPTIC_TRIGGER_THRESHOLD && hasTriggeredHaptic.value) {
                    hasTriggeredHaptic.value = false;
                }
            } else {
                // Finger moved back down — reset
                translateY.value = withTiming(0, { duration: 150 });
                hasTriggeredHaptic.value = false;
            }
        })
        .onEnd((event) => {
            if (isDismissing.value) return;
            if (lockedDirection.value !== 1) return;

            if (event.translationY < DELETE_THRESHOLD) {
                isDismissing.value = true;
                translateY.value = withTiming(-200, { duration: 200 });
                runOnJS(handleDelete)();
            } else {
                translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
                hasTriggeredHaptic.value = false;
            }
        })
        .onFinalize(() => {
            if (!isDismissing.value) {
                lockedDirection.value = 0;
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateY.value,
            [0, DELETE_THRESHOLD * 2],
            [1, 0],
            Extrapolate.CLAMP
        );
        const scale = interpolate(
            translateY.value,
            [0, DELETE_THRESHOLD * 2],
            [1, 0.85],
            Extrapolate.CLAMP
        );

        return {
            transform: [{ translateY: translateY.value }, { scale }],
            opacity,
            zIndex: translateY.value < -2 ? 100 : 1,
        };
    });

    const backgroundStyle = useAnimatedStyle(() => {
        const bgOpacity = interpolate(
            translateY.value,
            [0, -15],
            [0, 1],
            Extrapolate.CLAMP
        );

        const bgColor = interpolateColor(
            translateY.value,
            [0, DELETE_THRESHOLD],
            ['#FEF2F2', '#EF4444']
        );

        return {
            opacity: isDismissing.value ? 0 : bgOpacity,
            backgroundColor: bgColor,
        };
    });

    const iconStyle = useAnimatedStyle(() => {
        const iconScale = interpolate(
            translateY.value,
            [0, HAPTIC_TRIGGER_THRESHOLD],
            [0.5, 1.3],
            Extrapolate.CLAMP
        );

        const iconColor = interpolateColor(
            translateY.value,
            [0, HAPTIC_TRIGGER_THRESHOLD],
            ['#EF4444', '#FFFFFF']
        );

        return {
            transform: [{ scale: iconScale }],
            color: iconColor,
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.deleteBackground, backgroundStyle]}>
                <Animated.View style={styles.iconWrapper}>
                    <Animated.Text style={iconStyle}>
                        <Ionicons name="close" size={28} />
                    </Animated.Text>
                </Animated.View>
            </Animated.View>

            <GestureDetector gesture={gesture}>
                <Animated.View style={animatedStyle}>
                    {children}
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        overflow: 'visible',
        marginBottom: 8,
    },
    deleteBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        marginRight: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#EF4444',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
