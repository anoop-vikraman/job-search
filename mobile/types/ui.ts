import { TextInputProps, TouchableOpacityProps, ViewStyle } from 'react-native';

// Button Types
export type ButtonVariant = 'filled' | 'outlined' | 'text';
export type ButtonColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'black';
export type ButtonType = 'pill' | 'default';

export interface CustomButtonProps extends TouchableOpacityProps {
    onPress: () => void;
    children: React.ReactNode;
    type?: ButtonType;
    variant?: ButtonVariant;
    color?: ButtonColor;
    className?: string;
    textClassName?: string;
    loading?: boolean;
}

// Form Types
export interface CustomFloatingLabelProps extends TextInputProps {
    label: string;
    type?: 'text' | 'password' | 'phone' | 'email';
    error?: boolean | string;
    width?: number | string;
    showCharCount?: boolean;
    containerStyle?: any;
}

// Modal Types
export type ConfirmationVariant = 'danger' | 'success' | 'warning' | 'info';

export interface ConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmationVariant;
    isLoading?: boolean;
}

export interface ActionSheetModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: React.ReactNode;
    subtitle?: string;
    showCloseButton?: boolean;
    height?: string;
}

export interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: ViewStyle;
    keyboardOffset?: number;
    scrollable?: boolean;
    contentContainerStyle?: ViewStyle;
    edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export interface TabSelectorProps {
    options: SelectOption[];
    selected: string;
    onSelect: (value: string) => void;
}

// Component Option Types
export interface SelectOption {
    label: string;
    value: string;
    icon?: string;
}
