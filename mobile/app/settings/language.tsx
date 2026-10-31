import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';

const LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
];

export default function LanguageSettings() {
    const router = useRouter();
    const [selectedLanguage, setSelectedLanguage] = React.useState('en');

    const handleLanguageChange = (code: string) => {
        setSelectedLanguage(code);
        // In a real app, update i18n configuration here
        // i18n.changeLanguage(code);
    };

    return (
        <ScreenWrapper>
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Language</Text>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
                {LANGUAGES.map((language) => (
                    <TouchableOpacity
                        key={language.code}
                        onPress={() => handleLanguageChange(language.code)}
                        className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 flex-row items-center justify-between"
                    >
                        <View>
                            <Text className="font-bold text-gray-900">{language.nativeName}</Text>
                            <Text className="text-gray-500 text-sm">{language.name}</Text>
                        </View>
                        {selectedLanguage === language.code && (
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </ScreenWrapper>
    );
}
