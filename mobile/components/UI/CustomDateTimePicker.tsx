import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { palette } from '@tweak/theme';
import React, { useState } from 'react';
import { Platform, StyleProp, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface Props {
    label: string;
    value: Date | null;
    onChange: (date: Date) => void;
    placeholder?: string;
    containerStyle?: StyleProp<ViewStyle>;
    minimumDate?: Date;
    mode?: 'date' | 'time' | 'datetime';
}

export default function CustomDateTimePicker({
    label,
    value,
    onChange,
    placeholder = 'Select date and time',
    containerStyle,
    minimumDate,
    mode = 'date' // Default to date
}: Props): React.JSX.Element {
    const [showPicker, setShowPicker] = useState(false);
    // Internal mode state might still be needed for Android 2-step picking if mode is 'datetime'
    // But if mode is explicitly passed as 'date' or 'time', we respect it.
    const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>(mode);
    const [tempDate, setTempDate] = useState<Date>(new Date());

    const handlePress = () => {
        setTempDate(value || new Date());

        // If mode is datetime on Android, start with date then switch to time
        if (Platform.OS === 'android' && mode === 'datetime') {
            setPickerMode('date');
        } else {
            setPickerMode(mode);
        }

        setShowPicker(true);
    };

    const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false); // Close current picker
        }

        if (selectedDate) {
            const current = selectedDate;

            // If we are in 'datetime' mode (prop), we handle the 2-step flow for Android
            if (mode === 'datetime' && Platform.OS === 'android') {
                if (pickerMode === 'date') {
                    // Step 1: Date selected, now show Time
                    const newDate = new Date(tempDate);
                    newDate.setFullYear(current.getFullYear(), current.getMonth(), current.getDate());
                    setTempDate(newDate);

                    setPickerMode('time');
                    // Small delay to allow re-render/close interaction
                    setTimeout(() => setShowPicker(true), 100);
                } else {
                    // Step 2: Time selected, we are done
                    const newDate = new Date(tempDate);
                    newDate.setHours(current.getHours(), current.getMinutes());
                    onChange(newDate);
                }
            } else {
                // Single step mode (date or time only)
                onChange(current);
            }
        }
    };

    // iOS Specific Logic for "datetime" mode
    const handleIOSChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (selectedDate) {
            setTempDate(selectedDate);
            onChange(selectedDate); // Instant update? Or wait for close? 
            // Normally iOS input is inline or in a modal. Let's assume modal for now or standard inline
        }
    };

    const formatDate = (date: Date) => {
        if (mode === 'date') {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        if (mode === 'time') {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <View className="w-full mb-4" style={containerStyle}>
            <Text className="text-gray-400 text-[10px] font-bold mb-1 uppercase tracking-widest px-1">
                {label}
            </Text>

            <TouchableOpacity
                onPress={handlePress}
                className="flex-row items-center border border-gray-100 rounded-2xl px-4 py-3 bg-gray-50 h-[52px] justify-between"
            >
                <Text className={`text-base ${!value ? 'text-gray-400' : 'text-gray-800'}`}>
                    {value ? formatDate(value) : placeholder}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={palette.gray500} />
            </TouchableOpacity>

            {/* Picker Logic */}
            {showPicker && (
                Platform.OS === 'ios' ? (
                    // Simple modal wrapper or inline for iOS? 
                    // Let's use a Modal for iOS to mimic dropdown behavior if valid
                    // Or just render it below if inline.
                    // The user requested "either open two in one or a date picker and then a time selector".
                    // iOS supports mode="datetime".
                    <View className="mt-2 bg-gray-50 rounded-lg p-2 items-center">
                        <DateTimePicker
                            value={tempDate}
                            mode="datetime"
                            display="spinner"
                            onChange={handleIOSChange}
                            minimumDate={minimumDate}
                            textColor="black"
                        />
                        <TouchableOpacity
                            onPress={() => setShowPicker(false)}
                            className="self-end px-4 py-2"
                        >
                            <Text className="text-primary font-bold">Done</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <DateTimePicker
                        value={tempDate}
                        mode={pickerMode}
                        display="default"
                        onChange={handleChange}
                        minimumDate={minimumDate}
                    />
                )
            )}
        </View>
    );
}
