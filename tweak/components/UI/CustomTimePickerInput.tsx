import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ThemeTimePicker from './ThemeTimePicker';

interface Props {
    value: string; // "HH:mm" format
    onChange: (time: string) => void;
    placeholder?: string;
    defaultTime?: string; // "HH:mm" format
    hasError?: boolean;
}

export default function CustomTimePickerInput({ value, onChange, placeholder = "Select Time", defaultTime, hasError }: Props) {
    const [visible, setVisible] = useState(false);

    // Parse current time string to Date object or default to now/defaultTime
    const getDateObject = () => {
        if (!value) {
            if (defaultTime) {
                const [h, m] = defaultTime.split(':');
                const d = new Date();
                d.setHours(parseInt(h), parseInt(m), 0, 0);
                return d;
            }
            return new Date();
        }
        const [hours, minutes] = value.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date;
    };

    const [tempDate, setTempDate] = useState(getDateObject());



    const handleOpen = () => {
        setTempDate(getDateObject());
        setVisible(true);
    };

    const handleConfirm = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        onChange(`${hours}:${minutes}`);
        setVisible(false);
    };

    // Format display to AM/PM for user friendliness
    const displayValue = value ? (() => {
        const [hours, minutes] = value.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    })() : '';

    return (
        <View>
            <TouchableOpacity
                onPress={handleOpen}
                className={`bg-gray-50 border rounded-xl px-4 py-3 flex-row items-center justify-between ${hasError ? 'border-red-500' : 'border-gray-200'
                    }`}
            >
                <Text className={`font-bold text-base ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                    {displayValue || placeholder}
                </Text>
                <Ionicons name="time-outline" size={20} color={hasError ? '#EF4444' : '#9CA3AF'} />
            </TouchableOpacity>

            {visible && (
                <ThemeTimePicker
                    visible={visible}
                    onClose={() => setVisible(false)}
                    onConfirm={handleConfirm}
                    initialDate={tempDate}
                    title={placeholder}
                />
            )}
        </View>
    );
}
