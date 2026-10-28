import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: { display: 'none' }, // Hide the default tab bar since we use StandaloneTabBar globally
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="apply" options={{ title: 'Apply' }} />
            {/* Create is Center */}
            <Tabs.Screen name="create" options={{ title: 'Create' }} />
            <Tabs.Screen name="my-tweaks" options={{ title: 'My Tweaks' }} />
            <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />

            {/* Hidden tabs */}
            <Tabs.Screen name="invite" options={{ href: null }} />
            <Tabs.Screen name="offers" options={{ href: null }} />
        </Tabs>
    );
}
