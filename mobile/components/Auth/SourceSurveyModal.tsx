import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ActionSheetModal from '../UI/ActionSheetModal';
import CustomButton from '../UI/CustomButton';

import { palette } from '@tweak/theme';
import { SourceSurveyModalProps } from '../../types/auth';
import { StandardInput } from '../UI/StandardInput';

export default function SourceSurveyModal({
    visible,
    onClose,
    onComplete
}: SourceSurveyModalProps): React.JSX.Element {
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [otherSource, setOtherSource] = useState('');

    const sources: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { label: 'Search Engine', icon: 'search-outline' },
        { label: 'Social Media', icon: 'logo-instagram' },
        { label: 'Friend or Colleague', icon: 'people-outline' },
        { label: 'Online Advertisement', icon: 'megaphone-outline' },
        { label: 'Youtube', icon: 'logo-youtube' },
        { label: 'Blog or Article', icon: 'newspaper-outline' }
    ];

    const handleSubmit = () => {
        const finalSource = selectedSource === 'Other' ? otherSource : selectedSource;
        if (!finalSource && !otherSource) {
            onComplete('Skipped');
            return;
        }
        onComplete(finalSource || otherSource || 'Other');
    };

    const handleSelectOption = (source: string) => {
        setSelectedSource(source);
        // Direct submission on list selection as per user request
        onComplete(source);
    };

    return (
        <ActionSheetModal
            visible={visible}
            onClose={onClose}
            showCloseButton={false}
            height="" // Auto height to fit content
            title={
                <View className="flex-row justify-between items-center w-full">
                    <View />
                    <TouchableOpacity onPress={() => onComplete('Skipped')} className="px-2 py-1">
                        <Text className="text-gray-400 font-bold text-base">Skip</Text>
                    </TouchableOpacity>
                </View>
            }
        >
            <View className="mt-2 pb-6">
                <Text className="text-2xl font-bold text-gray-900 mb-2 px-2">
                    How did you hear about us?
                </Text>
                <Text className="text-gray-500 mb-8 px-2">
                    Help us understand how you found Tweak.
                </Text>

                <View className="w-full gap-3">
                    {sources.map((source) => (
                        <TouchableOpacity
                            key={source.label}
                            onPress={() => handleSelectOption(source.label)}
                            activeOpacity={0.7}
                            className="w-full flex-row items-center border border-gray-100 bg-gray-50/50 rounded-2xl p-4"
                        >
                            <View className="bg-white p-2 rounded-xl mr-4 shadow-sm">
                                <Ionicons name={source.icon} size={20} color={palette.indigo500} />
                            </View>
                            <Text className="text-gray-700 text-lg font-medium flex-1">
                                {source.label}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={palette.slate300} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View className="mt-8">
                    <View className="flex-row items-center mb-4">
                        <View className="h-[1px] bg-gray-100 flex-1" />
                        <Text className="text-gray-400 text-xs mx-4 uppercase tracking-widest font-bold">Or specify other</Text>
                        <View className="h-[1px] bg-gray-100 flex-1" />
                    </View>

                    <StandardInput
                        value={otherSource}
                        onChangeText={(text) => {
                            setOtherSource(text);
                            setSelectedSource(text ? 'Other' : null);
                        }}
                        onFocus={() => setSelectedSource('Other')}
                        placeholder="Start typing..."
                    />
                </View>

                {/* Confirm button only appears if user typing in Other field */}
                {selectedSource === 'Other' && otherSource.trim().length > 0 && (
                    <View className="w-full mt-8">
                        <CustomButton
                            onPress={handleSubmit}
                            className="rounded-2xl shadow-lg shadow-primary/20"
                        >
                            Continue
                        </CustomButton>
                    </View>
                )}
            </View>
        </ActionSheetModal>
    );
}

const styles = StyleSheet.create({});
