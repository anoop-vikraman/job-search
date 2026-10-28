import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { themeColors } from '../../themes/colors';

interface Props {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    error?: boolean;
}

export default function CustomOTPInput({ length = 6, value = '', onChange, error }: Props) {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);

    const handlePress = () => {
        inputRef.current?.focus();
    };

    return (
        <View style={styles.container}>
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={(text) => {
                    // Only allow numeric input
                    if (/^\d*$/.test(text) && text.length <= length) {
                        onChange(text);
                    }
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={styles.hiddenInput}
                keyboardType="number-pad"
                maxLength={length}
                textContentType="oneTimeCode" // iOS autofill
                autoComplete="sms-otp" // Android autofill
            />
            <Pressable onPress={handlePress} style={styles.inputsContainer}>
                {Array.from({ length }).map((_, index) => {
                    const digit = value[index];
                    const isCurrent = isFocused && index === value.length;
                    const isLastFilled = index === length - 1 && value.length === length;

                    // Highlight the current box or the last one if full
                    const isActive = isCurrent || (isFocused && isLastFilled && index === length - 1);

                    return (
                        <View
                            key={index}
                            style={[
                                styles.box,
                                isActive && styles.boxActive,
                                error && styles.boxError,
                            ]}
                        >
                            <Text style={styles.digit}>{digit}</Text>
                        </View>
                    );
                })}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 20,
    },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
    inputsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 10,
    },
    box: {
        width: 45,
        height: 55,
        borderWidth: 1,
        borderColor: '#F3F4F6', // gray-100
        borderRadius: 16, // rounded-2xl
        backgroundColor: '#F9FAFB', // gray-50
        justifyContent: 'center',
        alignItems: 'center',
    },
    boxActive: {
        borderColor: themeColors.primary,
        borderWidth: 1.5,
    },
    boxError: {
        borderColor: '#EF4444', // red-500
    },
    digit: {
        fontSize: 24,
        fontWeight: '600',
        color: '#000000',
    },
});
