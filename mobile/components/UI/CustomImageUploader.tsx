import { AntDesign, Entypo, Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleProp,
    Text,
    TouchableOpacity,
    View,
    ViewStyle
} from 'react-native';
import { palette } from '@tweak/theme';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import { themeColors } from '../../themes/colors';

import { TweakImage } from '../../types/tweak';

export type ImageItem = TweakImage;

interface Props {
    images: ImageItem[];
    onImagesChange: (images: ImageItem[]) => void;
    maxImages?: number;
    containerStyle?: StyleProp<ViewStyle>;
    showThumbnailFeature?: boolean;
}

export default function CustomImageUploader({
    images,
    onImagesChange,
    maxImages = 6,
    containerStyle,
    showThumbnailFeature = true
}: Props): React.JSX.Element {
    const [loading, setLoading] = useState(false);
    const confirm = useConfirmationStore(state => state.confirm);

    const compressImage = async (uri: string) => {
        try {
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1080 } }], // Resize to reasonable width
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // Compress to 50%
            );
            return result.uri;
        } catch (error) {
            console.error('Compression failed:', error);
            return uri; // Fallback to original
        }
    };

    const handlePickImage = async () => {
        if (images.length >= maxImages) {
            confirm({
                title: 'Limit Reached',
                message: `You can only upload up to ${maxImages} images.`,
                variant: 'warning',
                confirmLabel: 'OK'
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: maxImages - images.length,
            quality: 1, // We compress manually
        });

        if (!result.canceled) {
            setLoading(true);
            const newImages: ImageItem[] = [];
            for (const asset of result.assets) {
                const compressedUri = await compressImage(asset.uri);
                newImages.push({ uri: compressedUri, isThumbnail: false });
            }

            // If it's the first image added, make it thumbnail by default (only if feature enabled)
            if (showThumbnailFeature && images.length === 0 && newImages.length > 0) {
                newImages[0].isThumbnail = true;
            }

            onImagesChange([...images, ...newImages]);
            setLoading(false);
        }
    };

    const handleCamera = async () => {
        if (images.length >= maxImages) {
            confirm({
                title: 'Limit Reached',
                message: `You can only upload up to ${maxImages} images.`,
                variant: 'warning',
                confirmLabel: 'OK'
            });
            return;
        }

        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            confirm({
                title: 'Permission Required',
                message: 'Camera permission is needed to take photos.',
                variant: 'danger',
                confirmLabel: 'OK'
            });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 1,
        });

        if (!result.canceled) {
            setLoading(true);
            const compressedUri = await compressImage(result.assets[0].uri);
            const isThumbnail = showThumbnailFeature && images.length === 0;
            onImagesChange([...images, { uri: compressedUri, isThumbnail }]);
            setLoading(false);
        }
    };

    const [modalVisible, setModalVisible] = useState(false);

    const openUploadModal = () => {
        if (images.length >= maxImages) {
            confirm({
                title: 'Limit Reached',
                message: `You can only upload up to ${maxImages} images.`,
                variant: 'warning',
                confirmLabel: 'OK'
            });
            return;
        }
        setModalVisible(true);
    };

    const confirmDelete = (index: number) => {
        confirm({
            title: 'Delete Image?',
            message: 'Are you sure you want to remove this image? This action cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: () => handleDelete(index)
        });
    };

    const handleDelete = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        if (showThumbnailFeature && images[index].isThumbnail && newImages.length > 0) {
            newImages[0].isThumbnail = true;
        }
        onImagesChange(newImages);
    };

    const handleDoubleTap = (index: number) => {
        if (!showThumbnailFeature) return;
        const updatedImages = images.map((img, i) => ({
            ...img,
            isThumbnail: i === index,
        }));
        onImagesChange(updatedImages);
    };

    // Helper for double tap detection
    const lastTap = useRef<number | null>(null);
    const handlePress = (index: number) => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
            handleDoubleTap(index);
            lastTap.current = null;
        } else {
            lastTap.current = now;
        }
    };

    return (
        <View className="w-full" style={containerStyle}>
            {/* Main Container */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderRadius: 24,
                    height: 128,
                    backgroundColor: palette.blue50,
                    borderColor: images.length > 0 ? themeColors.primary : palette.blue200
                }}
            >
                {images.length === 0 ? (
                    <TouchableOpacity
                        onPress={openUploadModal}
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    >
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{ width: 40, height: 40, backgroundColor: 'white', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 1, shadowColor: palette.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
                                <AntDesign name="upload" size={20} color={themeColors.primary} />
                            </View>
                            <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Tap to Upload Images</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerClassName="items-center pl-4 pr-4 gap-3 py-3"
                    >
                        {images.map((img, index) => (
                            <Pressable
                                key={index}
                                onPress={() => handlePress(index)}
                                onLongPress={() => confirmDelete(index)}
                                className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200"
                                accessibilityRole="button"
                                accessibilityLabel="Image options"
                            >
                                <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />
                                {showThumbnailFeature && img.isThumbnail && (
                                    <View className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm">
                                        <Entypo name="star" size={12} color={palette.gold} />
                                    </View>
                                )}
                            </Pressable>
                        ))}

                        {/* Add Button */}
                        {images.length < maxImages && (
                            <TouchableOpacity
                                onPress={openUploadModal}
                                className="w-24 h-24 rounded-2xl justify-center items-center"
                                style={{ backgroundColor: themeColors.primary + '15' }} // 15% opacity of primary
                                accessibilityRole="button"
                                accessibilityLabel="Add image"
                            >
                                <AntDesign name="plus" size={24} color={themeColors.primary} />
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Helper Text */}
            {images.length > 0 && (
                <Text className="text-xs text-gray-400 mt-2 text-center">
                    Long press to delete {showThumbnailFeature ? '• Double tap to set thumbnail' : ''}
                </Text>
            )}


            {/* Upload Choice Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-center items-center"
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View className="bg-white w-3/4 rounded-2xl p-6 items-center shadow-xl">
                        <Text className="text-lg font-bold text-gray-800 mb-6">Upload Media</Text>

                        <TouchableOpacity
                            onPress={() => { setModalVisible(false); handleCamera(); }}
                            className="flex-row items-center w-full py-4 border-b border-gray-100"
                        >
                            <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-4">
                                <Ionicons name="camera" size={20} color={themeColors.primary} />
                            </View>
                            <Text className="text-base text-gray-700 font-medium">Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => { setModalVisible(false); handlePickImage(); }}
                            className="flex-row items-center w-full py-4"
                        >
                            <View className="w-10 h-10 bg-purple-50 rounded-full items-center justify-center mr-4">
                                <Ionicons name="images" size={20} color={themeColors.secondary} />
                            </View>
                            <Text className="text-base text-gray-700 font-medium">Choose from Gallery</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

        </View>
    );
}
