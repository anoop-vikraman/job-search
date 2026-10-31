import { themeColors } from '@/themes/colors';
import React, { useRef, useState } from 'react';
import { KeyboardTypeOptions, StyleProp, Text, TextInput, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import ScrollingPlaceholder from './ScrollingPlaceholder';

interface Props {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    scrollingPlaceholders?: string[]; // New Prop
    containerStyle?: StyleProp<ViewStyle>;
    secureTextEntry?: boolean;
    keyboardType?: KeyboardTypeOptions;
    multiline?: boolean;
    maxLength?: number;
    showCharCount?: boolean;
    error?: string;
    required?: boolean;
}

export default function CustomLabelledField({
    label,
    value,
    onChangeText,
    onBlur,
    placeholder,
    scrollingPlaceholders,
    containerStyle,
    secureTextEntry,
    keyboardType,
    multiline = false,
    maxLength,
    showCharCount,
    error,
    required
}: Props) {
    const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
    const [isFocused, setIsFocused] = useState(false);
    const currentLength = value?.length || 0;
    const remainingChars = maxLength ? maxLength - currentLength : 0;

    const showScrolling = scrollingPlaceholders && scrollingPlaceholders.length > 0 && !value && isFocused;

    return (
        <View style={[{ width: '100%', marginBottom: 16 }, containerStyle]}>
            {/* Label matched to StandardInput */}
            <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1.5, paddingHorizontal: 4 }}>
                {label} {required && <Text style={{ color: '#EF4444' }}>*</Text>}
            </Text>

            <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
                <View
                    style={{
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        position: 'relative',
                        backgroundColor: themeColors.primary + '08',
                        borderColor: error ? '#EF4444' : isFocused ? themeColors.primary : '#F3F4F6',
                        ...(multiline ? { paddingVertical: 12, minHeight: 80 } : { height: 56, justifyContent: 'center' })
                    }}
                >
                    <TextInput
                        ref={inputRef}
                        className={`py-3 text-gray-900 text-base font-medium ${multiline ? 'h-[100px] text-top pb-4' : ''}`}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor="#999"
                        secureTextEntry={secureTextEntry}
                        keyboardType={keyboardType}
                        multiline={multiline}
                        textAlignVertical={multiline ? 'top' : 'center'}
                        maxLength={maxLength}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => {
                            setIsFocused(false);
                            onBlur?.();
                        }}
                    />

                    {/* Scrolling Placeholder Overlay */}
                    {showScrolling && (
                        <View className="absolute top-3 left-4 right-4" pointerEvents="none">
                            <ScrollingPlaceholder
                                placeholders={scrollingPlaceholders}
                                textStyle={{ fontSize: 16, color: '#b8babcff' }}
                            />
                        </View>
                    )}

                    {showCharCount && maxLength && (
                        <Text className={`absolute bottom-2 left-4 text-xs ${remainingChars < 10 ? 'text-red-400' : 'text-gray-400'}`}>
                            {remainingChars}
                        </Text>
                    )}
                </View>
            </TouchableWithoutFeedback>
            {error && (
                <Text className="text-red-500 text-[10px] mt-1 ml-1 font-medium">{error}</Text>
            )}
        </View>
    );
}
