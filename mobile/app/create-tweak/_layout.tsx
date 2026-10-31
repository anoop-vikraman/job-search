import { Stack } from 'expo-router';
import React from 'react';

export default function CreateTweakLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="edit" options={{ headerShown: false }} />
            <Stack.Screen name="step2" options={{ headerShown: false }} />
            <Stack.Screen name="step3" options={{ headerShown: false }} />
            <Stack.Screen name="step4" options={{ headerShown: false }} />
            <Stack.Screen name="step5" options={{ headerShown: false }} />
        </Stack>
    );
}
