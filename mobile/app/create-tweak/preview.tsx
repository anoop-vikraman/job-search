import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import CreateFlowHeader from '../../components/create-tweak/CreateFlowHeader';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CustomConfirmationModal from '../../components/UI/CustomConfirmationModal';
import ImageGalleryModal from '../../components/UI/ImageGalleryModal';
import { Toast } from '../../components/UI/ToastManager';
import { FeatureFlags } from '../../constants/featureFlags';
import { useCreateTweakStore } from '../../store/useCreateTweakStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Tweak, useTweaksStore } from '../../store/useTweaksStore';
import { ScheduleSlot } from '../../types/tweak';
import { palette } from '@tweak/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PreviewImage {
    uri: string;
}

export default function TweakPreview(): React.JSX.Element {
    const router = useRouter();

    // Get data from Zustand store instead of URL params
    const {
        category,
        description,
        images,
        audioUri,
        address,
        skills,
        languages,
        schedulePreference,
        scheduleData,
        pricingModel,
        pricingData,
        tweakType
    } = useCreateTweakStore();

    const { user } = useAuthStore();
    const userId = user?.id || '';

    const [showImageGallery, setShowImageGallery] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);

    // Audio Playback
    const player = useAudioPlayer(audioUri || '');
    const playerStatus = useAudioPlayerStatus(player);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (playerStatus.didJustFinish) {
            player.pause();
            setIsPlaying(false);
            player.seekTo(0);
        }
    }, [playerStatus.didJustFinish]);

    const togglePlayback = () => {
        if (playerStatus.playing) {
            player.pause();
            setIsPlaying(false);
        } else {
            player.play();
            setIsPlaying(true);
        }
    };

    // Format helpers
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleImagePress = (index: number) => {
        setSelectedImageIndex(index);
        setShowImageGallery(true);
    };

    const handleEdit = () => {
        router.push('/create-tweak/edit');
    };

    const handleSaveDraft = async () => {
        if (FeatureFlags.USE_LOCAL_STORAGE_FOR_TWEAKS) {
            const draftTweak: Tweak = {
                id: Date.now().toString(),
                title: category || 'Untitled Draft',
                description: description || '',
                category: category || '',
                images: images || [],
                audioUri: audioUri,
                address: address,
                skills: skills || [],
                languages: languages || [],
                schedulePreference: schedulePreference || '',
                scheduleData: scheduleData,
                pricingModel: pricingModel || '',
                pricingData: pricingData,
                tweakType: tweakType || '',
                price: parseFloat(getTotalAmount()),
                pricingType: pricingModel || 'fixed',
                createdAt: new Date().toISOString(),
                status: 'draft',
                createdByUserId: userId,
            };

            addTweak(draftTweak);
        }
        setShowDraftModal(true);
    };

    const { addTweak } = useTweaksStore();

    const getTotalAmount = () => {
        if (pricingModel === 'quote') return '0';
        if (!pricingData) return '0';

        if (pricingModel === 'fixed') {
            return pricingData.price?.toString() || '0';
        } else if (pricingModel === 'quantity') {
            return pricingData.totalPrice?.toString() || '0';
        } else if (pricingModel === 'hourly') {
            return pricingData.price?.toString() || '0';
        }
        return '0';
    };

    const handlePost = () => {
        if (FeatureFlags.USE_LOCAL_STORAGE_FOR_TWEAKS) {
            const newTweak: Tweak = {
                id: Date.now().toString(),
                title: category || 'Untitled',
                description: description || '',
                category: category || 'General',
                images: images || [],
                audioUri: audioUri,
                address: address,
                skills: skills || [],
                languages: languages || [],
                schedulePreference: schedulePreference || '',
                scheduleData: scheduleData,
                pricingModel: pricingModel || '',
                pricingData: pricingData,
                tweakType: tweakType || '',
                price: parseFloat(getTotalAmount()),
                pricingType: pricingModel || 'fixed',
                createdAt: new Date().toISOString(),
                status: 'active',
                createdByUserId: userId,
            };
            addTweak(newTweak);
            setShowSuccessModal(true);
        } else {
            // Remote persistence path: POST /api/v1/tweaks (pending backend).
            Toast.error('Posting to the server is not available yet.');
        }
    };

    const getScheduleInfo = () => {
        if (!scheduleData) return 'Flexible';

        if (schedulePreference === 'one_day' && scheduleData.date) {
            return formatDate(new Date(scheduleData.date));
        } else if (schedulePreference === 'deadline' && (scheduleData.deadline || scheduleData.date)) {
            return `By ${formatDate(new Date(scheduleData.deadline || scheduleData.date || ''))}`;
        } else if (schedulePreference === 'few_days') {
            if (scheduleData.fewDaysSlots && scheduleData.fewDaysSlots.length > 0) {
                const days = scheduleData.fewDaysSlots.length;
                return `${days} ${days === 1 ? 'day' : 'days'}`;
            } else if (scheduleData.startDate && scheduleData.endDate) {
                const start = new Date(scheduleData.startDate);
                const end = new Date(scheduleData.endDate);
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                return `${days} ${days === 1 ? 'day' : 'days'}`;
            }
        }
        return 'Flexible';
    };

    const getTimeInfo = () => {
        if (!scheduleData) return 'Flexible';

        if (scheduleData.time) {
            return formatTime(new Date(scheduleData.time));
        } else if (scheduleData.timeSlots && scheduleData.timeSlots.length > 0) {
            return `${scheduleData.timeSlots.length} time slots`;
        }
        return 'Flexible';
    };

    const truncateText = (text: string | undefined | null, maxLength: number) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <ScreenWrapper>
            <CreateFlowHeader
                stepLabel="Preview Tweak"
                progress={1.0}
            />

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>
                <View className="flex-1 p-5 pb-8">

                    {/* 1. Category as Title */}
                    <Text className="text-3xl font-bold text-gray-900 mb-4 capitalize">{category || 'General Task'}</Text>

                    {/* 2. Location (if in-person) */}
                    {tweakType === 'in_person' && address && (
                        <TouchableOpacity onPress={() => setShowMapModal(true)} className="flex-row items-center mb-4">
                            <Ionicons name="location-sharp" size={18} color={palette.blue600} />
                            <Text className="text-gray-700 ml-1 text-base font-medium">{address?.city || 'Location'}, {address?.state || ''}</Text>
                            <Ionicons name="chevron-forward" size={16} color={palette.gray400} className="ml-1" />
                        </TouchableOpacity>
                    )}

                    {/* 3. Onsite or Remote */}
                    <View className="flex-row items-center mb-4">
                        <View className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                            <Text className="text-blue-700 font-bold text-[12px] uppercase tracking-wide">
                                {tweakType === 'remote' ? 'REMOTE' : 'ON-SITE'}
                            </Text>
                        </View>
                    </View>

                    {/* Price Display */}
                    <View style={{ backgroundColor: palette.indigo950 }} className="rounded-2xl p-5 mb-6 w-full flex-row items-center justify-between shadow-sm">
                        <View className="flex-1">
                            <Text className="text-white text-xs font-medium opacity-70 mb-1 uppercase tracking-wider">
                                Total Price
                            </Text>
                            {pricingModel === 'quantity' && pricingData && (
                                <Text className="text-white text-[11px] font-semibold opacity-90">
                                    ₹{pricingData.pricePerItem} per {pricingData.itemName || 'unit'}
                                </Text>
                            )}
                            {pricingModel === 'hourly' && pricingData && (
                                <Text className="text-white text-[11px] font-semibold opacity-90">
                                    Rate: ₹{pricingData.price}/hr
                                </Text>
                            )}
                            {pricingModel === 'fixed' && (
                                <Text className="text-white text-[11px] font-semibold opacity-90">
                                    FIXED RATE
                                </Text>
                            )}
                            {pricingModel === 'quote' && (
                                <Text className="text-white text-[11px] font-semibold opacity-90">
                                    APPLICANT TO QUOTE
                                </Text>
                            )}
                        </View>
                        <Text className="text-white text-3xl font-bold">
                            {pricingModel === 'quote' ? '-/-' : `₹${getTotalAmount()}`}
                        </Text>
                    </View>

                    {/* 4. Schedule & Availability Slots */}
                    {scheduleData && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 mb-3">Schedule & Availability</Text>

                            {/* Horizontal Scrollable Slots for Few Days or Deadline modes */}
                            {(schedulePreference === 'few_days' || schedulePreference === 'deadline') ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                                    <View className="flex-row gap-3">
                                        {(schedulePreference === 'few_days' ? scheduleData.fewDaysSlots : scheduleData.deadlineSlots)?.map((slot: ScheduleSlot, index: number) => {
                                            const slotDate = new Date(slot.date ?? '');
                                            const dayName = slotDate.toLocaleDateString('en-US', { weekday: 'short' });
                                            const day = slotDate.getDate();
                                            const month = slotDate.toLocaleDateString('en-US', { month: 'short' });

                                            return (
                                                <View key={index} className="bg-white border border-gray-200 rounded-xl p-3 min-w-[90px] items-center">
                                                    <Text className="text-gray-500 text-[10px] font-bold uppercase mb-1">{dayName}</Text>
                                                    <Text className="text-gray-900 text-lg font-bold mb-2">{day} {month}</Text>
                                                    <View className="bg-blue-50 px-2 py-1 rounded-md">
                                                        <Text className="text-blue-700 text-[10px] font-bold">
                                                            {slot.start} - {slot.end}
                                                        </Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            ) : schedulePreference === 'one_day' && scheduleData.date ? (
                                <View>
                                    <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center gap-3 mb-4">
                                        <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center">
                                            <Ionicons name="calendar-outline" size={24} color={palette.blue600} />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 font-medium uppercase mb-1">Date</Text>
                                            <Text className="text-base font-bold text-gray-900">{formatDate(new Date(scheduleData.date))}</Text>
                                        </View>
                                    </View>

                                    {scheduleData.timeSlots && scheduleData.timeSlots.length > 0 && (
                                        <View className="flex-row flex-wrap gap-2">
                                            {scheduleData.timeSlots.map((slot: ScheduleSlot, index: number) => (
                                                <View key={index} className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                                                    <Text className="text-blue-700 font-semibold text-sm">
                                                        {slot.start} - {slot.end}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ) : null}
                        </View>
                    )}

                    {/* 6. Description */}
                    {description && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 mb-3">About the Job</Text>
                            <Text className="text-gray-600 text-base leading-6">
                                {showFullDescription ? description : truncateText(description, 200)}
                            </Text>
                            {description.length > 200 && (
                                <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)} className="mt-2">
                                    <Text className="text-blue-600 font-semibold">{showFullDescription ? 'Show Less' : 'Read More'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* 7. Voice Instructions */}
                    {audioUri && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 mb-3">Voice Instructions</Text>
                            <View className="bg-white border border-gray-200 rounded-full p-2 pr-6 flex-row items-center shadow-sm">
                                <TouchableOpacity
                                    onPress={togglePlayback}
                                    className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-4"
                                    accessibilityRole="button"
                                    accessibilityLabel={isPlaying ? "Pause audio" : "Play audio"}
                                >
                                    <FontAwesome5 name={isPlaying ? "pause" : "play"} size={14} color={palette.gray700} />
                                </TouchableOpacity>

                                <Text className="text-sm font-bold text-gray-900 mr-4">
                                    {formatDuration(isPlaying ? playerStatus.currentTime : playerStatus.duration)}
                                </Text>

                                <View className="flex-1 h-8 justify-center gap-1 flex-row items-center opacity-40">
                                    {Array.from({ length: 15 }).map((_, i) => (
                                        <View key={i} className={`w-1 rounded-full ${i % 2 === 0 ? 'h-4 bg-gray-400' : 'h-6 bg-gray-600'}`} />
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* 8. Photos */}
                    {images && images.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 mb-3">Photos</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                                {images.map((img: PreviewImage, index: number) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => handleImagePress(index)}
                                        className="mr-3 shadow-md shadow-gray-200"
                                        accessibilityRole="button"
                                        accessibilityLabel="View image"
                                    >
                                        <Image
                                            source={{ uri: img.uri }}
                                            className="w-32 h-32 rounded-xl bg-gray-100"
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* 9. Skills Required */}
                    {skills && skills.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 mb-3">Skills Required</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {skills.map((skill: string, index: number) => (
                                    <View key={index} className="bg-gray-100 px-4 py-2 rounded-full border border-gray-200">
                                        <Text className="text-gray-700 font-medium">{skill}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* 10. Languages */}
                    {languages && languages.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-base font-bold text-gray-900 mb-3">Languages</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {languages.map((lang: string, index: number) => (
                                    <View key={index} className="bg-gray-100 px-4 py-2 rounded-full border border-gray-200">
                                        <Text className="text-gray-700 font-medium">{lang}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Action Buttons - At Bottom of Scroll */}
                    <View className="mt-auto pt-4 flex-row gap-3">
                        <TouchableOpacity
                            onPress={handleSaveDraft}
                            className="flex-1 bg-white border border-gray-300 py-4 rounded-xl flex-row items-center justify-center gap-1"
                        >
                            <Ionicons name="bookmark-outline" size={16} color={palette.gray700} />
                            <Text className="font-bold text-gray-700 text-sm">Draft</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleEdit}
                            className="flex-1 bg-white border border-gray-300 py-4 rounded-xl flex-row items-center justify-center gap-1"
                        >
                            <Ionicons name="create-outline" size={16} color={palette.gray700} />
                            <Text className="font-bold text-gray-700 text-sm">Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handlePost}
                            style={{ backgroundColor: palette.iosBlue }}
                            className="flex-[1.8] py-4 rounded-xl flex-row items-center justify-center gap-1 shadow-md"
                        >
                            <Text className="font-bold text-white text-sm">Post</Text>
                            <Ionicons name="arrow-forward" size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>

            {/* Map Modal */}
            {tweakType === 'in_person' && address && (
                <Modal
                    visible={showMapModal}
                    animationType="slide"
                    onRequestClose={() => setShowMapModal(false)}
                >
                    <View style={{ flex: 1 }}>
                        <View className="flex-row items-center justify-between p-4 pt-12 bg-white border-b border-gray-200">
                            <TouchableOpacity onPress={() => setShowMapModal(false)} className="p-2" accessibilityRole="button" accessibilityLabel="Close">
                                <Ionicons name="close" size={24} color="black" />
                            </TouchableOpacity>
                            <Text className="font-bold text-lg">{address?.city || 'Location'}</Text>
                            <View className="w-10" />
                        </View>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={{ flex: 1 }}
                            initialRegion={{
                                latitude: address?.latitude || 25.2048,
                                longitude: address?.longitude || 55.2708,
                                latitudeDelta: 0.1,
                                longitudeDelta: 0.1,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: address?.latitude || 25.2048,
                                    longitude: address?.longitude || 55.2708,
                                }}
                                title={address?.city}
                            />
                        </MapView>
                    </View>
                </Modal>
            )}

            {/* Image Gallery */}
            {images && images.length > 0 && (
                <ImageGalleryModal
                    visible={showImageGallery}
                    images={images.map((img: PreviewImage) => img.uri)}
                    initialIndex={selectedImageIndex}
                    onClose={() => setShowImageGallery(false)}
                />
            )}

            {/* Draft Saved Modal */}
            <CustomConfirmationModal
                visible={showDraftModal}
                onClose={() => setShowDraftModal(false)}
                onConfirm={() => {
                    setShowDraftModal(false);
                    router.push('/apply');
                }}
                title="Draft Saved"
                message="Your tweak has been saved as a draft. You can continue editing it later from the Drafts section."
                confirmLabel="View Drafts"
                variant="info"
            />

            {/* Success Modal */}
            <CustomConfirmationModal
                visible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                onConfirm={() => {
                    setShowSuccessModal(false);
                    router.push('/apply');
                }}
                title="Tweak Posted!"
                message="Your tweak has been posted successfully and is now live."
                confirmLabel="View My Tweaks"
                variant="success"
            />
        </ScreenWrapper>
    );
}
