import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import { themeColors } from '../../themes/colors';

interface ProfileBannerProps {
    onImageSelected?: (uri: string) => void;
}

export default function ProfileBanner({ onImageSelected }: ProfileBannerProps): React.JSX.Element {
    const router = useRouter();
    const { user } = useAuthStore();
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const confirm = useConfirmationStore(state => state.confirm);

    const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() || 'U';

    const handleCamera = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            confirm({
                title: 'Permission Required',
                message: 'Camera permission is needed to take photos.',
                variant: 'danger',
                confirmLabel: 'OK'
            });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
        });

        if (!result.canceled && onImageSelected) {
            onImageSelected(result.assets[0].uri);
        }
        setUploadModalVisible(false);
    };

    const handleGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
        });

        if (!result.canceled && onImageSelected) {
            onImageSelected(result.assets[0].uri);
        }
        setUploadModalVisible(false);
    };

    return (
        <View className="relative">
            {/* Gradient Background */}
            <View className="bg-gradient-to-br from-orange-500 to-purple-600 pt-4 pb-20 px-6 rounded-b-3xl">
                <View className="flex-row justify-between items-center mb-6">
                    <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white font-bold text-lg">My Profile</Text>
                    <TouchableOpacity onPress={() => router.push('/profile/edit')}>
                        <Text className="text-white font-semibold">Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Profile Picture */}
                <View className="items-center">
                    <View className="relative">
                        {user?.profilePictureUrl ? (
                            <Image source={{ uri: user.profilePictureUrl }} className="w-24 h-24 rounded-full border-4 border-white" />
                        ) : (
                            <View className="w-24 h-24 rounded-full border-4 border-white bg-white items-center justify-center">
                                <Text className="text-3xl font-bold" style={{ color: themeColors.primary }}>{initials}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={() => setUploadModalVisible(true)}
                            className="absolute bottom-0 right-0 bg-white w-8 h-8 rounded-full items-center justify-center border-2"
                            style={{ borderColor: themeColors.primary }}
                            accessibilityRole="button"
                            accessibilityLabel="Change profile photo"
                        >
                            <Ionicons name="camera" size={16} color={themeColors.primary} />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-white font-bold text-xl mt-4">{user?.firstName} {user?.lastName}</Text>
                    <Text className="text-white/80 text-sm">{user?.contactDetails?.email || 'No email'}</Text>
                    <Text className="text-white/80 text-sm">{user?.contactDetails?.countryCode} {user?.contactDetails?.mobileNumber}</Text>
                </View>
            </View>

            {/* Upload Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={uploadModalVisible}
                onRequestClose={() => setUploadModalVisible(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-center items-center"
                    activeOpacity={1}
                    onPress={() => setUploadModalVisible(false)}
                >
                    <View className="bg-white dark:bg-slate-900 w-3/4 rounded-2xl p-6 items-center shadow-xl">
                        <Text className="text-lg font-bold text-gray-800 dark:text-slate-50 mb-6">Upload Profile Picture</Text>

                        <TouchableOpacity
                            onPress={handleCamera}
                            className="flex-row items-center w-full py-4 border-b border-gray-100 dark:border-slate-700"
                        >
                            <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-4">
                                <Ionicons name="camera" size={20} color={themeColors.primary} />
                            </View>
                            <Text className="text-base text-gray-700 dark:text-slate-300 font-medium">Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleGallery}
                            className="flex-row items-center w-full py-4"
                        >
                            <View className="w-10 h-10 bg-purple-50 rounded-full items-center justify-center mr-4">
                                <Ionicons name="images" size={20} color={themeColors.secondary} />
                            </View>
                            <Text className="text-base text-gray-700 dark:text-slate-300 font-medium">Choose from Gallery</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
