import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import CreateFlowHeader from '../../components/create-tweak/CreateFlowHeader';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { SchedulePreference, useCreateTweakStore } from '../../store/useCreateTweakStore';
import { palette } from '@tweak/theme';

export default function PreferencesPage(): React.JSX.Element {
    const router = useRouter();
    const setSchedulePreference = useCreateTweakStore((state) => state.setSchedulePreference);

    const handleSelect = (pref: SchedulePreference) => {
        setSchedulePreference(pref);
        router.push('/create-tweak/schedule');
    };

    return (
        <ScreenWrapper>
            <CreateFlowHeader
                stepLabel="Scheduling Preference"
                progress={0.5}
            />

            <View className="px-6 py-8 flex-1">
                <Text className="text-3xl font-bold text-gray-900 dark:text-slate-50 mb-2">Select Timeline</Text>
                <Text className="text-gray-500 dark:text-slate-400 mb-8">Choose the scheduling option that works best for you.</Text>

                <View className="gap-4">
                    <PreferenceCard
                        icon="calendar"
                        color={palette.blue500}
                        title="Single Day Job"
                        desc="Best for quick tasks done in one visit."
                        onPress={() => handleSelect('one_day')}
                    />

                    <PreferenceCard
                        icon="hourglass"
                        color={palette.orange500}
                        title="Flexible Deadline"
                        desc="Task must be completed by a specific date."
                        onPress={() => handleSelect('deadline')}
                    />

                    <PreferenceCard
                        icon="calendar-number"
                        color={palette.green600}
                        title="Multi-day Project"
                        desc="Ideal for larger jobs spanning several days."
                        onPress={() => handleSelect('few_days')}
                    />
                </View>
            </View>
        </ScreenWrapper>
    );
}

interface PreferenceCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    title: string;
    desc: string;
    onPress: () => void;
}

const PreferenceCard = ({ icon, color, title, desc, onPress }: PreferenceCardProps) => (
    <TouchableOpacity
        onPress={onPress}
        className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 flex-row items-center shadow-sm active:border-primary active:bg-blue-50"
    >
        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4`} style={{ backgroundColor: `${color}15` }}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 dark:text-slate-50 mb-1">{title}</Text>
            <Text className="text-gray-500 dark:text-slate-400 text-sm leading-5">{desc}</Text>
        </View>
    </TouchableOpacity>
);
