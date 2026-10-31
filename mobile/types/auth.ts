export interface SourceSurveyModalProps {
    visible: boolean;
    onClose: () => void;
    onComplete: (source: string) => void;
}

export interface PasswordStrengthMeterProps {
    password?: string;
}
