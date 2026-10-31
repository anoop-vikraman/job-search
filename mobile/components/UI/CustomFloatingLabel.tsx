import { Entypo } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { themeColors } from '../../themes/colors';

import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import Animated, {
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

import { CustomFloatingLabelProps } from '../../types/ui';

export default function CustomFloatingLabel({
    label,
    type,
    error,
    width = '100%',
    onFocus,
    onBlur,
    value,
    onChangeText,
    showCharCount,
    containerStyle,
    leftComponent,
    ...props
}: CustomFloatingLabelProps & { leftComponent?: React.ReactNode }) {
    const [isFocused, setIsFocused] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

    // Shared value for animation (from 0 to 1)
    const animatedValue = useSharedValue(value ? 1 : 0);

    useEffect(() => {
        animatedValue.value = withTiming(isFocused || value ? 1 : 0, { duration: 200 });
    }, [isFocused, value]);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
    };

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    const labelStyle = useAnimatedStyle(() => {
        // Vertical translation: center (18) to top floating (-10)
        const translateY = interpolate(animatedValue.value, [0, 1], [14, -14]);

        // Horizontal translation: default (15) to floating adjustment
        // If leftComponent exists, we need to shift the label more or keep it relative?
        // Since leftComponent sits inside, the label should likely float above respecting the padding?
        // The label's position: 'absolute' with left: 15.
        // If leftComponent is there, we might need to adjust the start position or just let it float above everything?
        // Let's assume leftComponent pushes the input text, but the label might need adjustment if it's "inside".
        // Actually, typically floating label sits "above" the input area when focused.
        // When not focused (placeholder state), it should sit where the text starts.
        // If leftComponent is present, text starts after it.
        // So we need to dynamic adjust the 'left' or 'translateX' based on leftComponent presence?
        // For now, let's keep it simple. If leftComponent is typically a small icon/text, 
        // we might want the label to start *after* it when not focused?
        // Or just keep standard 15 if the component + padding is handled.

        const startX = leftComponent ? 0 : 0;
        const translateX = interpolate(animatedValue.value, [0, 1], [0, -4]);
        const scale = interpolate(animatedValue.value, [0, 1], [1, 0.85]);

        const color = interpolateColor(
            animatedValue.value,
            [0, 1],
            [
                error ? '#FF3B30' : '#666',
                error ? '#FF3B30' : isFocused ? themeColors.primary : '#666'
            ]
        );

        return {
            transform: [{ translateY }, { translateX }, { scale }],
            color,
        };
    });

    const isPassword = type === 'password';
    const currentLength = value?.length || 0;
    const remainingChars = props.maxLength ? props.maxLength - currentLength : 0;

    return (
        <View style={[styles.outerContainer, { width: width as any }, containerStyle]}>
            <View style={[
                styles.inputContainer,
                props.multiline && styles.inputContainerMultiline,
                isFocused && !error && styles.inputFocused,
                !!error && styles.inputError
            ]}>
                {leftComponent && (
                    <View style={{ paddingRight: 8, borderRightWidth: 1, borderRightColor: '#E5E7EB', marginRight: 10, height: '60%', alignItems: 'center', justifyContent: 'center' }}>
                        {leftComponent}
                    </View>
                )}

                <TextInput
                    ref={inputRef}
                    {...props}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    secureTextEntry={isPassword && !isVisible}
                    keyboardType={
                        type === 'phone'
                            ? 'phone-pad'
                            : type === 'email'
                                ? 'email-address'
                                : props.keyboardType || 'default'
                    }
                    maxLength={type === 'phone' ? 10 : props.maxLength}
                    autoCapitalize={type === 'email' ? 'none' : props.autoCapitalize}
                    placeholder=""
                    style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
                />

                {isPassword && value ? (
                    <Pressable onPress={toggleVisibility} style={styles.iconContainer}>
                        <Entypo
                            name={isVisible ? 'lock-open' : 'lock'}
                            size={20}
                            color={isVisible ? '#FF3B30' : '#000'}
                        />
                    </Pressable>
                ) : null}

                <Pressable
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { left: leftComponent ? 75 : 15, width: '100%' }]}
                >
                    <Animated.Text style={[styles.label, labelStyle]}>
                        {label}
                    </Animated.Text>
                </Pressable>

                {showCharCount && props.maxLength && (
                    <Text style={styles.charCount}>
                        {remainingChars}
                    </Text>
                )}
            </View>
            {typeof error === 'string' && (
                <Text style={styles.errorText}>{error}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        marginVertical: 12,
        paddingTop: 10,
    },
    inputContainer: {
        height: 55,
        borderWidth: 1,
        borderColor: '#BBB',
        borderRadius: 12,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        position: 'relative',
    },
    inputContainerMultiline: {
        height: 150,
        alignItems: 'flex-start',
    },
    inputFocused: {
        borderColor: themeColors.primary,
        borderWidth: 2,
    },
    inputError: {
        borderColor: '#FF3B30',
        borderWidth: 2,
    },
    label: {
        position: 'absolute',
        backgroundColor: '#fff',
        paddingHorizontal: 4,
        fontSize: 16,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#000',
        paddingVertical: 0,
    },
    inputMultiline: {
        paddingTop: 15,
        textAlignVertical: 'top',
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 10,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '500',
        marginTop: 4,
        marginLeft: 4,
    },
    charCount: {
        position: 'absolute',
        bottom: 8,
        left: 10,
        fontSize: 11,
        color: '#666',
    }
});