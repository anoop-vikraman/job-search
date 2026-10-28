import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageGalleryModalProps {
    visible: boolean;
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export default function ImageGalleryModal({
    visible,
    images,
    initialIndex = 0,
    onClose,
}: ImageGalleryModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handleNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.overlay}>
                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>

                    {/* Image Counter */}
                    <View style={styles.counter}>
                        <Ionicons name="images-outline" size={20} color="white" />
                        <Animated.Text style={styles.counterText}>
                            {currentIndex + 1} / {images.length}
                        </Animated.Text>
                    </View>

                    {/* Image Display */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: images[currentIndex] }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            {currentIndex > 0 && (
                                <TouchableOpacity
                                    style={[styles.navButton, styles.navButtonLeft]}
                                    onPress={handlePrevious}
                                >
                                    <Ionicons name="chevron-back" size={32} color="white" />
                                </TouchableOpacity>
                            )}

                            {currentIndex < images.length - 1 && (
                                <TouchableOpacity
                                    style={[styles.navButton, styles.navButtonRight]}
                                    onPress={handleNext}
                                >
                                    <Ionicons name="chevron-forward" size={32} color="white" />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 24,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 24,
    },
    counter: {
        position: 'absolute',
        top: 50,
        left: 24,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
    },
    counterText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    imageContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        marginTop: -24,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 24,
    },
    navButtonLeft: {
        left: 24,
    },
    navButtonRight: {
        right: 24,
    },
});
