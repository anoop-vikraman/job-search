import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '@/themes/ThemeProvider';

const reliabilityScore = {
    score: 0,
    positiveActs: [] as { name: string; points: number }[],
    negativeActs: [] as { name: string; points: number }[],
};

export default function ScorePage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const { score, positiveActs, negativeActs } = reliabilityScore;

    return (
        <ScreenWrapper>
            {/* Header */}
            <View className="flex-row justify-between items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">Score</Text>
                <TouchableOpacity onPress={() => router.push('/settings/terms')}>
                    <Text className="text-sm text-gray-600 dark:text-slate-300">Offense policy</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 py-4">
                {/* Offense Tracker */}
                <View className="bg-white dark:bg-slate-900 rounded-2xl p-6 mb-4 shadow-sm border border-gray-100 dark:border-slate-700">
                    <Text className="font-bold text-lg mb-4 text-gray-900 dark:text-slate-50">Offense tracker</Text>
                    <View className="flex-row items-center bg-green-50 p-4 rounded-xl">
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 mb-1">Great job!</Text>
                            <Text className="text-gray-600 text-sm">You do not have any offenses</Text>
                        </View>
                        <Text className="text-4xl">👍</Text>
                    </View>
                </View>

                {/* Reliability Score */}
                <View className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 mb-4 shadow-sm">
                    <View className="flex-row justify-between items-start mb-4">
                        <View>
                            <Text className="text-white text-sm mb-2">Reliability score</Text>
                            <View className="flex-row items-center">
                                <Text className="text-white font-bold text-5xl mr-3">{score}</Text>
                                <Text className="text-3xl">🚀</Text>
                            </View>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View className="mb-4">
                        <View className="h-2 bg-purple-400 rounded-full overflow-hidden">
                            <View
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${Math.min((score / 100) * 100, 100)}%` }}
                            />
                        </View>
                        <View className="flex-row justify-between mt-2">
                            <Text className="text-white/70 text-xs">Insufficient</Text>
                            <Text className="text-white/70 text-xs">Sufficient</Text>
                            <Text className="text-white/70 text-xs">Extreme</Text>
                            <Text className="text-white/70 text-xs">Elite</Text>
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                        <Text className="text-white/80 text-sm">Finish first shift to improve your score</Text>
                        <TouchableOpacity
                            onPress={() => setModalVisible(true)}
                            className="bg-white px-4 py-2 rounded-lg"
                        >
                            <Text className="font-semibold text-purple-700">Learn More</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Job Performance */}
                <View className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                    <Text className="font-bold text-lg mb-4 text-gray-900 dark:text-slate-50">Job performance</Text>
                    <View className="items-center py-8">
                        <View className="bg-gray-100 dark:bg-slate-800 w-16 h-16 rounded-full items-center justify-center mb-4">
                            <Ionicons name="briefcase-outline" size={32} color={colors.textSecondary} />
                        </View>
                        <Text className="font-bold text-gray-900 dark:text-slate-50 mb-2">No jobs yet</Text>
                        <Text className="text-gray-500 dark:text-slate-400 text-center mb-4">Finish a job to track your progress here</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/apply')}
                            className="bg-gray-900 px-6 py-3 rounded-xl"
                        >
                            <Text className="text-white font-semibold">Look for a job</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Reliability Score Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 bg-black/50">
                    <TouchableOpacity
                        className="flex-1"
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    />
                    <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 max-h-[80%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-900 dark:text-slate-50">Reliability score</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close">
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="bg-purple-600 rounded-xl p-4 flex-row justify-between items-center mb-6">
                                <Text className="text-white font-bold text-sm">Reliability score</Text>
                                <View className="flex-row items-center">
                                    <Text className="text-white font-bold text-3xl mr-2">{score}</Text>
                                    <Text className="text-2xl">🚀</Text>
                                </View>
                            </View>

                            <Text className="text-center text-gray-600 dark:text-slate-300 mb-6">Reliability score = <Text className="text-green-600 font-semibold">Positive acts</Text> - <Text className="text-red-600 font-semibold">Negative acts</Text></Text>

                            {/* Positive Acts */}
                            <Text className="font-bold text-gray-900 dark:text-slate-50 mb-3">Positive acts</Text>
                            {positiveActs.map((act, index) => (
                                <View key={index} className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
                                    <Text className="text-gray-700 dark:text-slate-300">{act.name}</Text>
                                    <Text className="text-green-600 font-semibold">+{act.points}</Text>
                                </View>
                            ))}

                            {/* Negative Acts */}
                            <Text className="font-bold text-gray-900 dark:text-slate-50 mt-6 mb-3">Negative acts</Text>
                            {negativeActs.map((act, index) => (
                                <View key={index} className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
                                    <Text className="text-gray-700 dark:text-slate-300">{act.name}</Text>
                                    <Text className="text-red-600 font-semibold">{act.points}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
}
