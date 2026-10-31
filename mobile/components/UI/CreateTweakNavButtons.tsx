import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { themeColors } from '../../themes/colors';

interface CreateTweakNavButtonsProps {
    onNext: () => void;
    onSaveDraft?: () => void;
    nextLabel?: string;
    showDraft?: boolean;
    isLoading?: boolean;
}

export default function CreateTweakNavButtons({
    onNext,
    onSaveDraft,
    nextLabel = 'Next',
    showDraft = true,
    isLoading = false,
}: CreateTweakNavButtonsProps) {
    return (
        <View style={styles.container}>
            {showDraft && onSaveDraft && (
                <TouchableOpacity
                    onPress={onSaveDraft}
                    style={styles.draftButton}
                    disabled={isLoading}
                    activeOpacity={0.7}
                >
                    <Ionicons name="bookmark-outline" size={20} color={themeColors.primary} />
                    <Text style={styles.draftButtonText}>Save Draft</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                onPress={onNext}
                style={[styles.nextButton, !showDraft && styles.nextButtonFull]}
                disabled={isLoading}
                activeOpacity={0.8}
            >
                <Text style={styles.nextButtonText}>{nextLabel}</Text>
                <Ionicons name="arrow-forward" size={22} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        flexDirection: 'row',
        gap: 12,
        zIndex: 10,
    },
    draftButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: themeColors.primary,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    draftButtonText: {
        color: themeColors.primary,
        fontSize: 16,
        fontWeight: '700',
    },
    nextButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: themeColors.primary,
        shadowColor: themeColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    nextButtonFull: {
        flex: 1,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});
