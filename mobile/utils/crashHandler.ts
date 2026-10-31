import { useFatalErrorStore } from '../store/useFatalErrorStore';

// Global JS error handler using React Native's built-in ErrorUtils.
// (Replaces react-native-exception-handler, which is unmaintained and untested
// on the New Architecture.)

type ErrorUtilsType = {
    getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
    setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

const errorUtils: ErrorUtilsType | undefined = (globalThis as any).ErrorUtils;

if (errorUtils) {
    const previousHandler = errorUtils.getGlobalHandler();

    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        if (isFatal) {
            useFatalErrorStore.getState().showError(error);
        }
        // Preserve the default handler (red box in dev, native crash reporting in prod).
        previousHandler?.(error, isFatal);
    });
}
