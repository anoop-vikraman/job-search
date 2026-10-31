import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DraftConfirmationDialogProps {
    visible: boolean;
    onSaveDraft: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export default function DraftConfirmationDialog({
    visible,
    onSaveDraft,
    onDiscard,
    onCancel
}: DraftConfirmationDialogProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="save-outline" size={32} color="#6366F1" />
                    </View>

                    <Text style={styles.title}>Save as Draft?</Text>
                    <Text style={styles.message}>
                        You haven't finished creating this tweak. Would you like to save your progress?
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.saveDraftButton]}
                            onPress={onSaveDraft}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="bookmark-outline" size={20} color="white" />
                            <Text style={styles.saveDraftText}>Save as Draft</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.discardButton]}
                            onPress={onDiscard}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.discardText}>Discard</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    dialog: {
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 16,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    buttonContainer: {
        gap: 10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    saveDraftButton: {
        backgroundColor: '#6366F1',
    },
    saveDraftText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    discardButton: {
        backgroundColor: '#FEE2E2',
    },
    discardText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    cancelText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
    },
});
