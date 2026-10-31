import React, { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { themeColors } from '../../themes/colors';
import { WheelPicker } from './WheelPicker';

interface Props {
    visible: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate?: Date;
    title?: string;
}

export default function ThemeTimePicker({
    visible,
    onClose,
    onConfirm,
    initialDate = new Date(),
    title = 'Select Time'
}: Props) {
    // Generate arrays
    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
    const periods = ['AM', 'PM'];

    // Derive initial values from prop
    const getInitialValues = () => {
        let h = initialDate.getHours();
        const m = initialDate.getMinutes();
        const isPm = h >= 12;

        if (h > 12) h -= 12;
        if (h === 0) h = 12;

        return {
            h: String(h).padStart(2, '0'),
            m: String(m).padStart(2, '0'),
            p: isPm ? 'PM' : 'AM'
        };
    };

    const initialTime = getInitialValues();

    // Internal State
    const [selectedHour, setSelectedHour] = useState(initialTime.h);
    const [selectedMinute, setSelectedMinute] = useState(initialTime.m);
    const [selectedPeriod, setSelectedPeriod] = useState(initialTime.p);

    // Keep updated if props change unexpectedly while open
    useEffect(() => {
        if (visible) {
            const time = getInitialValues();
            setSelectedHour(time.h);
            setSelectedMinute(time.m);
            setSelectedPeriod(time.p);
        }
    }, [visible, initialDate]);

    const handleConfirm = () => {
        const date = new Date(initialDate); // Keep original date parts (year/month/day)

        let h = parseInt(selectedHour);
        const m = parseInt(selectedMinute);

        if (selectedPeriod === 'PM' && h !== 12) h += 12;
        if (selectedPeriod === 'AM' && h === 12) h = 0;

        date.setHours(h);
        date.setMinutes(m);
        date.setSeconds(0);

        onConfirm(date);
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 justify-center items-center bg-black/50 px-6">
                    <TouchableWithoutFeedback>
                        <View className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
                            {/* Header */}
                            <View className="p-4 border-b border-gray-100">
                                <Text className="text-xl font-bold text-gray-900 text-center">{title}</Text>
                            </View>

                            {/* Pickers Container */}
                            <View className="flex-row justify-center items-center py-6 px-4">
                                {/* Hour */}
                                <View className="flex-1 items-center">
                                    <Text className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Hour</Text>
                                    <WheelPicker
                                        items={hours}
                                        selectedValue={selectedHour}
                                        onValueChange={setSelectedHour}
                                        containerStyle={{ width: 60 }}
                                    />
                                </View>

                                {/* Separator */}
                                <Text className="text-2xl font-bold text-gray-300 mx-2 mt-4">:</Text>

                                {/* Minute */}
                                <View className="flex-1 items-center">
                                    <Text className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Minute</Text>
                                    <WheelPicker
                                        items={minutes}
                                        selectedValue={selectedMinute}
                                        onValueChange={setSelectedMinute}
                                        containerStyle={{ width: 60 }}
                                    />
                                </View>

                                {/* Period */}
                                <View className="flex-1 items-center pl-4">
                                    <Text className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">AM/PM</Text>
                                    <WheelPicker
                                        items={periods}
                                        selectedValue={selectedPeriod}
                                        onValueChange={setSelectedPeriod}
                                        containerStyle={{ width: 60 }}
                                    />
                                </View>
                            </View>

                            {/* Footer Buttons */}
                            <View className="flex-row p-4 pt-2 gap-3">
                                <TouchableOpacity
                                    onPress={onClose}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 items-center justify-center"
                                >
                                    <Text className="text-gray-600 font-bold text-base">Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleConfirm}
                                    className="flex-1 py-3 rounded-xl items-center justify-center"
                                    style={{ backgroundColor: themeColors.primary }}
                                >
                                    <Text className="text-white font-bold text-base">Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
