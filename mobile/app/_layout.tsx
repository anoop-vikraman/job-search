import SafeAreaStatusBar from "@/components/UI/SafeAreaStatusBar";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../global.css";
import { themeColors } from '../themes/colors';
import '../utils/crashHandler'; // Initialize Crash Handler
import '../utils/i18n';

import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import { ThemeProvider } from "@/themes/ThemeProvider";
import StandaloneTabBar from "@/components/Navigation/StandaloneTabBar";
import GlobalConfirmationModal from "@/components/UI/GlobalConfirmationModal";
import GlobalFatalErrorModal from "@/components/UI/GlobalFatalErrorModal";
import NoInternetBanner from "@/components/UI/NoInternetBanner";
import ToastManager from "@/components/UI/ToastManager";
import { useAuthStore } from "@/store/useAuthStore";

function AppContent() {
  const { isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Route protection: keep authed users out of auth screens and
  // push unauthenticated users to login when they hit a protected route.
  useEffect(() => {
    const currentGroup = segments[0] as string;
    const isAuthRoute =
      currentGroup === 'auth' || currentGroup === 'login' || currentGroup === 'signup';

    if (isAuthenticated && isAuthRoute) {
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !isAuthRoute) {
      router.replace('/login');
    }
  }, [isAuthenticated, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <SafeAreaStatusBar backgroundColor={themeColors.background} style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerTintColor: themeColors.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: themeColors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: true, headerTransparent: true, headerTitle: '', headerBackTitle: '', headerBackVisible: true, headerShadowVisible: false }} />
        <Stack.Screen name="signup" options={{ headerShown: true, headerTransparent: true, headerTitle: '', headerBackTitle: '', headerBackVisible: true, headerShadowVisible: false }} />
        <Stack.Screen name="auth" options={{ headerShown: true, headerTransparent: true, headerTitle: '', headerBackTitle: '', headerBackVisible: true, headerShadowVisible: false }} />
      </Stack>

      <StandaloneTabBar />

      {/* Global Overlays */}
      <ToastManager />
      <NoInternetBanner />
      <GlobalConfirmationModal />
      <GlobalFatalErrorModal />

    </GestureHandlerRootView>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}