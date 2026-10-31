import { AntDesign, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
    StyleProp,
} from 'react-native';
import { themeColors } from '../../themes/colors';

interface Option {
    label: string;
    value: string;
}

interface Props {
    label: string;
    options: Option[];
    value: string | string[]; // Single value or array for multi
    onChange: (value: string | string[]) => void;
    multiSelect?: boolean;
    placeholder?: string;
    containerStyle?: StyleProp<ViewStyle>;
    visible?: boolean;
    onVisibleChange?: (visible: boolean) => void;
}

export default function CustomDropdown({
    label,
    options,
    value,
    onChange,
    multiSelect = false,
    placeholder = 'Select an option',
    containerStyle,
    visible: externalVisible,
    onVisibleChange,
}: Props) {
    const [internalVisible, setInternalVisible] = useState(false);

    const visible = externalVisible !== undefined ? externalVisible : internalVisible;
    const setVisible = (v: boolean) => {
        if (onVisibleChange) {
            onVisibleChange(v);
        } else {
            setInternalVisible(v);
        }
    };

    const [searchText, setSearchText] = useState('');
    const [tempValues, setTempValues] = useState<string[]>([]);

    const isSelected = (itemValue: string) => {
        if (multiSelect) {
            return tempValues.includes(itemValue);
        }
        return value === itemValue;
    };

    const handleOpen = () => {
        if (multiSelect && Array.isArray(value)) {
            setTempValues([...value]);
        }
        setVisible(true);
    };

    const handleSelect = (itemValue: string) => {
        if (multiSelect) {
            setTempValues(current =>
                current.includes(itemValue)
                    ? current.filter(v => v !== itemValue)
                    : [...current, itemValue]
            );
        } else {
            onChange(itemValue);
            setVisible(false);
        }
    };

    const handleConfirm = () => {
        onChange(tempValues);
        setVisible(false);
    };

    const handleRemoveChip = (itemValue: string) => {
        if (multiSelect && Array.isArray(value)) {
            onChange(value.filter((v) => v !== itemValue));
        }
    };

    const getDisplayValue = () => {
        if (multiSelect) return '';
        if (!value) return '';
        const selectedOption = options.find((opt) => opt.value === value);
        return selectedOption ? selectedOption.label : '';
    };

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchText.toLowerCase())
    );

    const handleSearchSubmit = () => {
        if (filteredOptions.length > 0) {
            handleSelect(filteredOptions[0].value);
        }
    };

    return (
        <View style={[{ width: '100%', marginBottom: 16 }, containerStyle]}>
            <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1.5, paddingHorizontal: 4 }}>
                {label}
            </Text>

            <TouchableOpacity
                onPress={handleOpen}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#F3F4F6',
                    borderRadius: 16,
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    backgroundColor: '#F9FAFB',
                    minHeight: 52,
                    justifyContent: 'space-between'
                }}
            >
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {multiSelect && Array.isArray(value) && value.length > 0 ? (
                        value.map((val) => {
                            const opt = options.find((o) => o.value === val);
                            return (
                                <TouchableOpacity key={val} onPress={() => handleRemoveChip(val)}>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderRadius: 999,
                                            paddingHorizontal: 12,
                                            paddingVertical: 4,
                                            backgroundColor: themeColors.primary + '20'
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                fontWeight: '500',
                                                marginRight: 4,
                                                color: themeColors.primary
                                            }}
                                        >
                                            {opt?.label || val}
                                        </Text>
                                        <AntDesign name="close" size={14} color={themeColors.primary} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <Text style={{ fontSize: 16, marginLeft: 8, paddingVertical: 8, color: (!value || (Array.isArray(value) && value.length === 0)) ? '#9CA3AF' : '#1F2937' }}>
                            {getDisplayValue() || placeholder}
                        </Text>
                    )}
                </View>

                {(!Array.isArray(value) || value.length === 0) && (
                    <View style={{ marginLeft: 8, paddingRight: 4 }}>
                        <Ionicons name="chevron-down" size={18} color="#6B7280" />
                    </View>
                )}
            </TouchableOpacity>

            {/* Selection Modal */}
            <Modal
                transparent={true}
                visible={visible}
                animationType="slide"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View className="flex-1 justify-end bg-black/50">
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-t-3xl h-[70%] w-full overflow-hidden">
                                {/* Header */}
                                <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100">
                                    <Text className="text-lg font-bold" style={{ color: themeColors.primary }}>{label}</Text>
                                    <TouchableOpacity onPress={() => setVisible(false)} accessibilityRole="button" accessibilityLabel="Close">
                                        <AntDesign name="close" size={24} color="#374151" />
                                    </TouchableOpacity>
                                </View>

                                {/* Search Bar */}
                                <View className="px-4 py-2">
                                    <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                                        <Ionicons name="search" size={20} color="#9CA3AF" />
                                        <TextInput
                                            className="flex-1 ml-2 text-base text-gray-800"
                                            placeholder="Search..."
                                            value={searchText}
                                            onChangeText={setSearchText}
                                            placeholderTextColor="#9CA3AF"
                                            autoFocus={true} // Auto focus
                                            onSubmitEditing={handleSearchSubmit} // Enter to select
                                            returnKeyType="done"
                                        />
                                    </View>
                                </View>

                                {/* List */}
                                <ScrollView contentContainerClassName="px-4 pb-10">
                                    {filteredOptions.length === 0 ? (
                                        <Text className="text-center text-gray-500 mt-10">No options found</Text>
                                    ) : (
                                        filteredOptions.map((item) => {
                                            const active = isSelected(item.value);
                                            return (
                                                <TouchableOpacity
                                                    key={item.value}
                                                    onPress={() => handleSelect(item.value)}
                                                    className={`flex-row justify-between items-center py-4 border-b border-gray-50 ${active ? 'bg-blue-50/50 -mx-4 px-4' : ''}`}
                                                >
                                                    <Text className="text-base" style={active ? { fontWeight: 'bold', color: themeColors.primary } : { color: '#374151' }}>
                                                        {item.label}
                                                    </Text>
                                                    {active && (
                                                        <Ionicons name="checkmark-circle" size={22} color={themeColors.primary} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </ScrollView>

                                {/* Done Button for MultiSelect */}
                                {multiSelect && (
                                    <View className="p-4 border-t border-gray-100 pb-8 bg-white">
                                        <TouchableOpacity
                                            onPress={handleConfirm}
                                            style={{
                                                backgroundColor: themeColors.primary,
                                                borderRadius: 12,
                                                paddingVertical: 16,
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}
