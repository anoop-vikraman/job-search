import { create } from 'zustand';
import { ConfirmationVariant } from '../types/ui';

interface ConfirmationOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmationVariant;
    onConfirm?: () => void;
    onCancel?: () => void;
}

interface ConfirmationState {
    visible: boolean;
    options: ConfirmationOptions;
    confirm: (options: ConfirmationOptions) => void;
    close: () => void;
}

const defaultOptions: ConfirmationOptions = {
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'info',
};

export const useConfirmationStore = create<ConfirmationState>((set) => ({
    visible: false,
    options: defaultOptions,
    confirm: (options) => set({
        visible: true,
        options: { ...defaultOptions, ...options }
    }),
    close: () => set({ visible: false }),
}));
