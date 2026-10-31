import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler';
import { useFatalErrorStore } from '../store/useFatalErrorStore';

// Define the error handler function (Rendered UI or Alert)
const handleError = (error: Error, isFatal: boolean) => {
    if (isFatal) {
        // Trigger the custom modal via global store
        useFatalErrorStore.getState().showError(error);

        // Optional: Keep the native alert as a secondary fallback if JS engine is dying
        /*
        Alert.alert(
            'Unexpected Error Occurred',
            `Error: ${error.message}`,
            [{ text: 'Restart' }]
        );
        */
    } else {
        console.log(error); // Log non-fatal errors
    }
};

// JS Exceptions (Uncaught Promises / Syntax)
setJSExceptionHandler((error, isFatal) => {
    handleError(error, isFatal);
}, true); // true = allow handler in dev mode too

// Native Crashes (Java/Kotlin/ObjC exceptions)
setNativeExceptionHandler((errorString) => {
    // This runs in a critical state where UI might not work well
    // But on Android it tries to show a toast or log
    console.error('Native Handling Error:', errorString);
});
