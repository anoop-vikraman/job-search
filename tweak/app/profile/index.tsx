import { Ionicons } from '@expo/vector-icons';
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
import { themeColors } from '../../themes/colors';
import { Toast } from '../../components/UI/ToastManager';

export default function ProfilePage() {
    const router = useRouter();
    const { logout, allUsers, switchUser, user } = useAuthStore();
    const confirm = useConfirmationStore(state => state.confirm);

    const handleLogout = () => {
        confirm({
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            variant: 'danger',
            confirmLabel: 'Logout',
            onConfirm: () => {
                logout();
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

                    {/* Developer Quick Switch */}
                    <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <View className="flex-row items-center mb-4 gap-2">
                            <Ionicons name="construct-outline" size={18} color="#64748B" />
                            <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider">Quick Switch (Dev Mode)</Text>
                        </View>
                        
                        {allUsers.length === 0 ? (
                            <Text className="text-gray-400 italic text-center py-2">No other users registered yet</Text>
                        ) : (
                            <View className="gap-2">
                                {allUsers.map((u) => (
                                    <TouchableOpacity
                                        key={u.id}
                                        onPress={() => {
                                            switchUser(u.id);
                                            Toast.success(`Switched to ${u.firstName}`);
                                        }}
                                        className={`flex-row items-center justify-between p-3 rounded-xl border ${u.id === user?.id ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'}`}
                                    >
                                        <View className="flex-row items-center gap-3">
                                            <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
                                                <Text className="font-bold text-gray-500">{u.firstName[0]}</Text>
                                            </View>
                                            <View>
                                                <Text className={`font-bold ${u.id === user?.id ? 'text-primary' : 'text-gray-900'}`}>{u.firstName} {u.lastName}</Text>
                                                <Text className="text-xs text-gray-500">{u.contactDetails.mobileNumber}</Text>
                                            </View>
                                        </View>
                                        {u.id === user?.id && <Ionicons name="checkmark-circle" size={20} color={themeColors.primary} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        
                        <TouchableOpacity 
                            onPress={() => router.push('/signup')}
                            className="mt-4 p-2 items-center"
                        >
                            <Text className="text-primary font-semibold text-xs">+ Register Another Test User</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Version */}
                <View className="px-6 pb-8">
                    <Text className="text-gray-400 text-center text-sm">Version 1.0.0</Text>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}
