import { Ionicons } from '@expo/vector-icons';
import { palette } from '@tweak/theme';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../themes/ThemeProvider';

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
}: DraftConfirmationDialogProps): React.JSX.Element {
    const { colors, isDark } = useTheme();
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.dialog, isDark && { backgroundColor: colors.surface }]}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="save-outline" size={32} color={palette.indigo500} />
                    </View>

                    <Text style={[styles.title, isDark && { color: colors.text }]}>Save as Draft?</Text>
                    <Text style={[styles.message, isDark && { color: colors.textSecondary }]}>
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
                            style={[styles.button, styles.cancelButton, isDark && { backgroundColor: colors.surfaceMuted }]}
                            onPress={onCancel}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.cancelText, isDark && { color: colors.textSecondary }]}>Cancel</Text>
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
        shadowColor: palette.black,
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
        color: palette.gray900,
        textAlign: 'center',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: palette.gray500,
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
        backgroundColor: palette.indigo500,
    },
    saveDraftText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    discardButton: {
        backgroundColor: palette.red100,
    },
    discardText: {
        color: palette.red600,
        fontSize: 14,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: palette.gray100,
    },
    cancelText: {
        color: palette.gray500,
        fontSize: 14,
        fontWeight: '600',
    },
});
