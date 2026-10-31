import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mediaApi } from '../../api/media';
import { userApi } from '../../api/user';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { StandardInput } from '../../components/UI/StandardInput';
import { Toast } from '../../components/UI/ToastManager';
import { useAuthStore } from '../../store/useAuthStore';
import { themeColors } from '../../themes/colors';
import { palette } from '@tweak/theme';
import { useTheme } from '@/themes/ThemeProvider';

interface ProfileFormData {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    gender: string;
    bio: string;
}

export default function EditProfilePage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { user, updateUser } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const { control, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.contactDetails?.email || '',
            dateOfBirth: user?.dateOfBirth || '',
            gender: user?.gender || '',
            bio: user?.bio || ''
        }
    });

    const onSubmit = async (data: ProfileFormData) => {
        if (!user?.id) return;
        setIsSubmitting(true);
        try {
            await userApi.updateMe({
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email,
                date_of_birth: data.dateOfBirth,
                gender: data.gender,
                bio: data.bio,
                profile_picture_url: user.profilePictureUrl,
            });

            updateUser({
                firstName: data.firstName,
                lastName: data.lastName,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                bio: data.bio,
                contactDetails: {
                    ...user.contactDetails,
                    email: data.email
                }
            });

            Toast.success("Profile updated successfully");
            router.back();
        } catch (error) {
            Toast.error("Could not update profile");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImageUpload = async () => {
        if (isUploading) return;

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Toast.error('Photo library permission is required');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled || result.assets.length === 0) return;

        const asset = result.assets[0];
        setIsUploading(true);
        try {
            const { url } = await mediaApi.upload({
                uri: asset.uri,
                name: asset.fileName ?? `profile-${Date.now()}.jpg`,
                type: asset.mimeType ?? 'image/jpeg',
            });
            await userApi.updateMe({ profile_picture_url: url });
            updateUser({ profilePictureUrl: url });
            Toast.success('Profile photo updated');
        } catch {
            // Error toast is surfaced by the axios interceptor.
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ScreenWrapper>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Close">
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
                <TouchableOpacity onPress={() => handleSubmit(onSubmit)()} disabled={isSubmitting}>
                    <Text style={[styles.saveButtonText, isSubmitting && { opacity: 0.5 }]}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.avatarContainer}>
                    {user?.profilePictureUrl ? (
                        <Image source={{ uri: user.profilePictureUrl }} style={[styles.avatar, { backgroundColor: colors.surfaceMuted }]} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceMuted }]}>
                            <Ionicons name="person" size={40} color={themeColors.primary} />
                        </View>
                    )}
                    <TouchableOpacity style={styles.changePhotoButton} onPress={handleImageUpload} disabled={isUploading}>
                        <Text style={styles.changePhotoText}>{isUploading ? 'Uploading…' : 'Change Profile Photo'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Controller
                        control={control}
                        name="firstName"
                        render={({ field: { onChange, value } }) => (
                            <StandardInput
                                label="First Name"
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter first name"
                            />
                        )}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Controller
                        control={control}
                        name="lastName"
                        render={({ field: { onChange, value } }) => (
                            <StandardInput
                                label="Last Name"
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter last name"
                            />
                        )}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, value } }) => (
                            <StandardInput
                                label="Email"
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        )}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Controller
                            control={control}
                            name="dateOfBirth"
                            render={({ field: { onChange, value } }) => (
                                <StandardInput
                                    label="Date of Birth"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    placeholder="YYYY-MM-DD"
                                />
                            )}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Controller
                            control={control}
                            name="gender"
                            render={({ field: { onChange, value } }) => (
                                <StandardInput
                                    label="Gender"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    placeholder="Gender"
                                />
                            )}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Controller
                        control={control}
                        name="bio"
                        render={({ field: { onChange, value } }) => (
                            <StandardInput
                                label="Bio"
                                value={value || ''}
                                onChangeText={onChange}
                                placeholder="Tell us about yourself"
                                multiline
                                numberOfLines={4}
                            />
                        )}
                    />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: palette.gray100,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.gray900,
    },
    saveButtonText: {
        color: themeColors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    scrollContent: {
        padding: 24,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
        backgroundColor: palette.gray100,
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    changePhotoButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: palette.indigo50,
        borderRadius: 20,
    },
    changePhotoText: {
        color: themeColors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    inputGroup: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: palette.gray700,
        marginBottom: 8,
    },
});
