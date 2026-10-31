import * as Updates from 'expo-updates';
import React from 'react';
import { useFatalErrorStore } from '../../store/useFatalErrorStore';
import CustomConfirmationModal from './CustomConfirmationModal';

export default function GlobalFatalErrorModal(): React.JSX.Element {
    const { visible, error, hideError } = useFatalErrorStore();

    const handleRestart = async () => {
        try {
            // 1. Try Expo Updates (Standard for managed apps)
            await Updates.reloadAsync();
        } catch (e) {
            console.error("Updates.reloadAsync() failed, trying fallbacks:", e);

            // 2. Try DevSettings (Common for development mode)
            try {
                const { DevSettings } = require('react-native');
                if (DevSettings && DevSettings.reload) {
                    DevSettings.reload();
                    return;
                }
            } catch (devError) {
                console.error("DevSettings reload failed:", devError);
            }

            // 3. Last resort: Hide modal and hope for the best
            hideError();
        }
    };

    return (
        <CustomConfirmationModal
            visible={visible}
            onClose={hideError}
            onConfirm={handleRestart}
            title="Critical Error Occurred"
            message={error?.message || "The application encountered a fatal problem and needs to restart to recover your session."}
            confirmLabel="Restart App"
            variant="danger"
        />
    );
}
