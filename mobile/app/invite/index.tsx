import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import { palette } from '@tweak/theme';

const referralData = { totalEarnings: 0, friendsInvited: 0, referralLink: '' };

export default function InvitePage() {
    const router = useRouter();
    const confirm = useConfirmationStore(state => state.confirm);
    const { totalEarnings, friendsInvited, referralLink } = referralData;

    const shareReferral = async () => {
        try {
            await Share.share({
                message: `Join Tweak and earn money doing short-term jobs! Use my referral link: ${referralLink}`,
                url: referralLink,
            });
        } catch (error) {
            confirm({
                title: 'Error',
                message: 'Unable to share referral link.',
                variant: 'danger',
                confirmLabel: 'OK'
            });
        }
    };

    const copyLink = () => {
        // In a real app, use Clipboard API
        confirm({
            title: 'Copied!',
            message: 'Referral link copied to clipboard.',
            variant: 'success',
            confirmLabel: 'OK'
        });
    };

    return (
        <ScreenWrapper>
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-4" accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={palette.gray900} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Invite Friends</Text>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
                {/* Referral Card */}
                <View className="bg-purple-50 rounded-3xl p-6 mb-4 border border-purple-200">
                    <Text className="text-center text-purple-900 text-3xl font-bold mb-2">Get ₹100</Text>
                    <Text className="text-center text-purple-700 mb-6">Refer and help your friends to get a job</Text>

                    {/* Referral Link */}
                    <View className="bg-white rounded-xl p-4 flex-row items-center justify-between mb-4 border border-purple-200">
                        <View className="flex-row items-center flex-1 mr-2">
                            <Ionicons name="link" size={20} color={palette.purple500} />
                            <Text className="text-gray-600 text-sm ml-2 flex-1" numberOfLines={1}>{referralLink}</Text>
                        </View>
                        <TouchableOpacity onPress={copyLink} accessibilityRole="button" accessibilityLabel="Copy link">
                            <Ionicons name="copy" size={20} color={palette.purple500} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={shareReferral}
                        className="bg-purple-600 py-4 rounded-xl"
                    >
                        <Text className="text-white font-bold text-center text-base">Share Referral Link</Text>
                    </TouchableOpacity>
                </View>

                {/* Earnings Card */}
                <View className="bg-purple-50 rounded-2xl p-4 mb-6 border border-purple-200">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-gray-700 font-semibold">Total Earnings</Text>
                        <Text className="text-purple-900 font-bold text-xl">₹{totalEarnings}</Text>
                    </View>
                    <Text className="text-gray-500 text-sm mt-2">You've invited {friendsInvited} friends</Text>
                </View>

                {/* How it Works */}
                <Text className="font-bold text-lg text-gray-900 mb-4">How it works</Text>

                <View className="space-y-4 mb-6">
                    {[
                        { step: '1', title: 'Invite a Friend', desc: 'Just share your link', color: 'bg-purple-100', textColor: 'text-purple-700' },
                        { step: '2', title: 'They get a job', desc: 'and complete 10 shifts', color: 'bg-blue-100', textColor: 'text-blue-700' },
                        { step: '3', title: 'You get 100 ₹', desc: 'For each friend', color: 'bg-green-100', textColor: 'text-green-700' },
                    ].map((item, index) => (
                        <View key={index} className="flex-row items-start mb-4">
                            <View className={`w-10 h-10 rounded-full ${item.color} items-center justify-center mr-4`}>
                                <Text className={`font-bold ${item.textColor}`}>{item.step}</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-gray-900 mb-1">{item.title}</Text>
                                <Text className="text-gray-500 text-sm">{item.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Referral Terms */}
                <TouchableOpacity
                    onPress={() => router.push('/settings/terms')}
                    className="flex-row items-center justify-end"
                >
                    <Text className="text-purple-600 font-semibold mr-1">Referral Terms</Text>
                    <Ionicons name="chevron-forward" size={16} color={palette.purple500} />
                </TouchableOpacity>
            </ScrollView>
        </ScreenWrapper>
    );
}
