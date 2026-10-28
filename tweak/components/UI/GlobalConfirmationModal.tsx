import React from 'react';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import CustomConfirmationModal from './CustomConfirmationModal';

export default function GlobalConfirmationModal() {
    const { visible, options, close } = useConfirmationStore();

    const handleConfirm = () => {
        if (options.onConfirm) {
            options.onConfirm();
        }
        close();
    };

    const handleCancel = () => {
        if (options.onCancel) {
            options.onCancel();
        }
        close();
    };

    return (
        <CustomConfirmationModal
            visible={visible}
            onClose={handleCancel}
            onConfirm={handleConfirm}
            title={options.title}
            message={options.message}
            confirmLabel={options.confirmLabel}
            cancelLabel={options.cancelLabel}
            variant={options.variant}
        />
    );
}
