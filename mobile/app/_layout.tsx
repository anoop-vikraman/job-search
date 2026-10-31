import SafeAreaStatusBar from "@/components/UI/SafeAreaStatusBar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../global.css";
import '../utils/crashHandler'; // Initialize Crash Handler
import '../utils/i18n';

import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import { ThemeProvider, useTheme } from "@/themes/ThemeProvider";
import StandaloneTabBar from "@/components/Navigation/StandaloneTabBar";
import GlobalConfirmationModal from "@/components/UI/GlobalConfirmationModal";
import GlobalFatalErrorModal from "@/components/UI/GlobalFatalErrorModal";
import NoInternetBanner from "@/components/UI/NoInternetBanner";
import ToastManager from "@/components/UI/ToastManager";
import { useAuthStore } from "@/store/useAuthStore";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useRealtime } from "@/hooks/useRealtime";

// Module-level client so it persists across re-renders.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { isAuthenticated } = useAuthStore();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  usePushNotifications(isAuthenticated);
  useRealtime(isAuthenticated);

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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaStatusBar backgroundColor={colors.background} style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: colors.background,
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
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}