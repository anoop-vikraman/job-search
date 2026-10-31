import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, StyleProp, Text, TouchableOpacity, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import { themeColors } from '../../themes/colors';

interface Props {
    label: string;
    value: Date | null;
    onChange: (date: Date) => void;
    placeholder?: string;
    containerStyle?: StyleProp<ViewStyle>;
    minimumDate?: Date;
    maximumDate?: Date;
}

export default function CustomDatePicker({
    label,
    value,
    onChange,
    placeholder = 'Select date',
    containerStyle,
    minimumDate,
    maximumDate,
}: Props) {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(value || new Date());

    const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (selectedDate) {
            setTempDate(selectedDate);
            onChange(selectedDate);

            if (Platform.OS === 'android') {
                setShowPicker(false);
            }
        }
    };

    const handleOpen = () => {
        setTempDate(value || new Date());
        setShowPicker(true);
    };

    const handleConfirm = () => {
        onChange(tempDate);
        setShowPicker(false);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <View className="w-full mb-4" style={containerStyle}>
            <Text className="text-gray-400 text-[10px] font-bold mb-1 uppercase tracking-widest px-1">
                {label}
            </Text>

            <TouchableOpacity
                onPress={handleOpen}
                className="flex-row items-center border rounded-2xl px-4 py-3 bg-gray-50 h-[52px] justify-between"
                style={{
                    borderColor: value ? themeColors.primary : '#F3F4F6',
                    borderWidth: 1
                }}
            >
                <Text className={`text-base ${!value ? 'text-gray-400' : 'text-gray-900'}`}>
                    {value ? formatDate(value) : placeholder}
                </Text>
                <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={value ? themeColors.primary : "#6B7280"}
                />
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
                <Modal
                    transparent
                    visible={showPicker}
                    animationType="fade"
                    onRequestClose={() => setShowPicker(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
                        <View className="flex-1 justify-center items-center bg-black/50 px-4">
                            <TouchableWithoutFeedback>
                                <View className="bg-white p-4 rounded-2xl w-full max-w-sm shadow-xl">
                                    <Text className="text-lg font-bold text-gray-900 mb-4 text-center">
                                        {label}
                                    </Text>

                                    <View className="bg-gray-50 rounded-xl overflow-hidden mb-4">
                                        <DateTimePicker
                                            value={tempDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={(event, date) => {
                                                if (date) setTempDate(date);
                                            }}
                                            minimumDate={minimumDate}
                                            maximumDate={maximumDate}
                                            textColor="#000000"
                                        />
                                    </View>

                                    <TouchableOpacity
                                        onPress={handleConfirm}
                                        className="py-4 rounded-xl items-center"
                                        style={{ backgroundColor: themeColors.primary }}
                                    >
                                        <Text className="text-white font-bold text-lg">Confirm</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            ) : (
                showPicker && (
                    <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="default"
                        onChange={handleChange}
                        minimumDate={minimumDate}
                        maximumDate={maximumDate}
                    />
                )
            )}
        </View>
    );
}
