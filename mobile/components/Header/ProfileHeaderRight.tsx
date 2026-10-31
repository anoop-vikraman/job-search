import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { themeColors } from '../../themes/colors';

export default function ProfileHeaderRight() {
    const router = useRouter();
    const { user } = useAuthStore();

    // Default avatar if no profile picture
    const defaultAvatar = "https://ui-avatars.com/api/?background=6366F1&color=fff&name=" +
        ((user?.firstName || 'User') + '+' + (user?.lastName || ''));

    const handlePress = () => {
        router.push('/profile');
    };

    return (
        <TouchableOpacity onPress={handlePress} style={{ marginRight: 16 }} accessibilityRole="button" accessibilityLabel="Open profile">
            {user?.profilePictureUrl ? (
                <Image
                    source={{ uri: user.profilePictureUrl }}
                    style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' }}
                />
            ) : (
                <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#EEF2FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#C7D2FE'
                }}>
                    <Ionicons name="person" size={18} color={themeColors.primary} />
                </View>
            )}
        </TouchableOpacity>
    );
}
