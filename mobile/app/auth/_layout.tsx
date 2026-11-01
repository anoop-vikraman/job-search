import { Stack } from 'expo-router';
import React from 'react';

// Groups the auth screens (check-mobile, create-password, otp) under a single
// `auth` route so the parent Stack.Screen name="auth" in app/_layout.tsx resolves.
export default function AuthLayout(): React.JSX.Element {
    return <Stack screenOptions={{ headerShown: false }} />;
}
