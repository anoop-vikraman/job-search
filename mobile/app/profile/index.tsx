import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import PastTweaksTabs from '../../components/Profile/PastTweaksTabs';
import ProfileBanner from '../../components/Profile/ProfileBanner';
import ProfileCompletionCard from '../../components/Profile/ProfileCompletionCard';
import ProfileMenuList from '../../components/Profile/ProfileMenuList';
import ProfileQuickActions from '../../components/Profile/ProfileQuickActions';
import ProfileStats from '../../components/Profile/ProfileStats';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfirmationStore } from '../../store/useConfirmationStore';

export default function ProfilePage() {
    const router = useRouter();
    const { logout } = useAuthStore();
    const confirm = useConfirmationStore(state => state.confirm);

    const handleLogout = () => {
        confirm({
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            variant: 'danger',
            confirmLabel: 'Logout',
            onConfirm: async () => {
                await logout();
                router.replace('/login');
            }
        });
    };

    return (
        <ScreenWrapper scrollable={false}>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Profile Banner */}
                <ProfileBanner />

                {/* Profile Stats */}
                <ProfileStats />

                {/* Profile Completion Card */}
                <ProfileCompletionCard />

                {/* Quick Actions */}
                <ProfileQuickActions />

                {/* Menu List */}
                <ProfileMenuList />

                {/* Past Tweaks */}
                <PastTweaksTabs />

                {/* Logout Button */}
                <View className="px-6 py-6">
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="bg-white rounded-xl py-4 border-2 border-red-500 mb-6"
                    >
                        <Text className="text-red-500 font-bold text-center text-lg">Log Out</Text>
                    </TouchableOpacity>
                </View>

                {/* Version */}
                <View className="px-6 pb-8">
                    <Text className="text-gray-400 text-center text-sm">Version 1.0.0</Text>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}
