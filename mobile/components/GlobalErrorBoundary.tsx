import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import React from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
    const handleRestart = async () => {
        try {
            // 1. Try Expo Updates
            await Updates.reloadAsync();
        } catch (e) {
            console.error("Updates.reloadAsync() failed, trying fallbacks:", e);

            // 2. Try DevSettings in development
            try {
                const { DevSettings } = require('react-native');
                if (DevSettings && DevSettings.reload) {
                    DevSettings.reload();
                    return;
                }
            } catch (devError) {
                console.error("DevSettings reload failed:", devError);
            }
        }
    };

    return (
        <View style={styles.container}>
            <View className="bg-white rounded-[40px] w-[90%] p-8 shadow-2xl items-center">
                <View className="bg-red-50 p-6 rounded-full mb-6">
                    <Ionicons name="alert-circle" size={48} color="#EF4444" />
                </View>

                <Text className="text-2xl font-bold text-gray-900 text-center mb-2 px-2">
                    Something went wrong
                </Text>

                <Text className="text-gray-500 text-center text-base mb-10 px-4 leading-6">
                    {(error as Error).message || "An unexpected error occurred in the application interface."}
                </Text>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={resetErrorBoundary}
                    className="w-full bg-indigo-500 py-4 rounded-2xl items-center shadow-lg shadow-black/10 mb-3"
                >
                    <Text className="text-white font-bold text-lg">Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleRestart}
                    className="w-full border-2 border-red-500 py-4 rounded-2xl items-center"
                >
                    <Text className="text-red-500 font-bold text-lg">Restart App</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

interface Props {
    children: React.ReactNode;
}

export default function GlobalErrorBoundary({ children }: Props) {
    return (
        <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => {
                // Potential cleanup logic
            }}
            onError={(error) => {
                console.error("UI Boundary Caught Error:", error);
            }}
        >
            {children}
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'white',
    }
});
