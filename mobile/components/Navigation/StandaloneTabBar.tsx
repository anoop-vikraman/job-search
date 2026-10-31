import { Ionicons } from '@expo/vector-icons';
import { NavigationContext } from '@react-navigation/native';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useCreateTweakStore } from '../../store/useCreateTweakStore';

const { width, height } = Dimensions.get('window');
const TAB_HEIGHT = 80;
const CENTER_BUTTON_RADIUS = 28; // Smaller button (was 35)

const TABS = [
    { name: 'index', label: 'Home', icon: 'home', outlineIcon: 'home-outline', route: '/(tabs)' },
    { name: 'apply', label: 'Apply', icon: 'search', outlineIcon: 'search-outline', route: '/(tabs)/apply' },
    { name: 'create', label: 'Create', route: 'create', isSpacer: true },
    { name: 'my-tweaks', label: 'My Tweaks', icon: 'list', outlineIcon: 'list-outline', route: '/(tabs)/my-tweaks' },
    { name: 'notifications', label: 'Alerts', icon: 'notifications', outlineIcon: 'notifications-outline', route: '/(tabs)/notifications' },
];

// Inner component that safely uses navigation hooks (only rendered when context exists)
function StandaloneTabBarInner() {
    const router = useRouter();
    const segments = useSegments();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const setTweakType = useCreateTweakStore((state) => state.setTweakType);
    const reset = useCreateTweakStore((state) => state.reset);

    // Don't show tab bar on auth pages, creation flow, or tweak details
    const currentGroup = segments[0] as string;
    if (['auth', 'login', 'signup', 'create-tweak', 'tweaks'].includes(currentGroup)) {
        return null;
    }

    const handleCreateSelect = (type: 'remote' | 'in_person') => {
        setIsMenuOpen(false);
        reset();

        if (type === 'in_person') {
            setTweakType('in_person');
            router.push('/create-tweak/location-entry');
        } else {
            setTweakType('remote');
            router.push('/create-tweak/category');
        }
    };

    const getPath = () => {
        const center = width / 2;
        const radius = 35; // Adjusted for smaller button (was 42)

        return `
            M0,0
            L${center},0
            Q${center},0 ${center},10
            Q${center},${radius * 1.5} ${center},10
            Q${center},0 ${center},0
            L${width},0
            L${width},${TAB_HEIGHT}
            L0,${TAB_HEIGHT}
            Z
        `;
    };

    // Determine the active tab based on segments
    // For index, segments might just be ['(tabs)']
    // For tweaks, segments might be ['(tabs)', 'tweaks']
    const activeRouteName = segments.length > 1 && segments[0] === '(tabs)' ? segments[1] : 'index';

    // If we're not inside the main app navigation, default to nothing or keep Home lit?
    // We'll just light up the tab based on segments.
    // E.g. /profile might not light any tab unless we want it to map to one.
    const activeRouteMatch = TABS.find((tab) => tab.name === activeRouteName) || TABS[0];
    const isTabActive = (tabName: string) => activeRouteMatch.name === tabName && segments[0] === '(tabs)';

    return (
        <View style={styles.container}>
            <Svg width={width} height={TAB_HEIGHT} style={styles.svg}>
                <Path d={getPath()} fill="white" stroke="#E5E7EB" strokeWidth={1} />
            </Svg>

            <View style={styles.content}>
                {TABS.map((tab, index) => {
                    // Spacer for Create (Center) to separate Tweaks and Jobs
                    if (tab.isSpacer) {
                        return <View key={tab.name} style={{ width: 60 }} />;
                    }

                    const isFocused = isTabActive(tab.name);

                    const onPress = () => {
                        if (!isFocused) {
                            router.push(tab.route as any);
                        }
                    };

                    return (
                        <TabItem
                            key={tab.name}
                            label={tab.label}
                            iconName={isFocused ? tab.icon : tab.outlineIcon}
                            isFocused={isFocused}
                            onPress={onPress}
                        />
                    );
                })}
            </View>

            {/* Overlay to close menu */}
            {isMenuOpen && (
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setIsMenuOpen(false)}
                />
            )}

            {/* Create Menu */}
            {isMenuOpen && (
                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleCreateSelect('remote')}
                    >
                        <View style={[styles.menuIconContainer, { backgroundColor: '#DBEAFE' }]}>
                            <Ionicons name="laptop-outline" size={20} color="#3B82F6" />
                        </View>
                        <Text style={styles.menuText}>Remote Tweak</Text>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleCreateSelect('in_person')}
                    >
                        <View style={[styles.menuIconContainer, { backgroundColor: '#FFEDD5' }]}>
                            <Ionicons name="location" size={20} color="#F97316" />
                        </View>
                        <Text style={styles.menuText}>Onsite Tweak</Text>
                    </TouchableOpacity>

                    {/* Arrow pointing down */}
                    <View style={styles.menuArrow} />
                </View>
            )}

            {/* Center Floating Button (CREATE) */}
            <TouchableOpacity
                style={[styles.centerButton, isMenuOpen && styles.centerButtonActive]}
                activeOpacity={0.8}
                onPress={() => setIsMenuOpen(!isMenuOpen)}
            >
                <Ionicons
                    name={isMenuOpen ? "close" : "add"}
                    size={32}
                    color="white"
                />
            </TouchableOpacity>
        </View>
    );
}

// Exported wrapper: only renders the inner tab bar when navigation context is available
// AND we are not in an unstable state.
export default function StandaloneTabBar() {
    const navigationContext = React.useContext(NavigationContext);

    // Safety check for Expo Router context
    if (!navigationContext) {
        return null;
    }

    return <StandaloneTabBarInner />;
}

const TabItem = ({ label, iconName, isFocused, onPress }: any) => {
    return (
        <TouchableOpacity onPress={onPress} style={styles.tabItem}>
            <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? '#007AFF' : '#9CA3AF'}
            />
            <Text style={[
                styles.tabLabel,
                { color: isFocused ? '#007AFF' : '#9CA3AF' }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: TAB_HEIGHT,
        backgroundColor: 'transparent',
    },
    svg: {
        position: 'absolute',
        top: 0,
        left: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '100%',
        paddingHorizontal: 10,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        paddingTop: 10,
    },
    tabLabel: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: '500',
    },
    centerButton: {
        position: 'absolute',
        top: -20, // Adjusted top position
        left: width / 2 - CENTER_BUTTON_RADIUS,
        width: CENTER_BUTTON_RADIUS * 2,
        height: CENTER_BUTTON_RADIUS * 2,
        borderRadius: CENTER_BUTTON_RADIUS,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 4,
        borderColor: '#F3F4F6',
        zIndex: 20,
    },
    centerButtonActive: {
        transform: [{ rotate: '45deg' }],
        backgroundColor: '#005bb5',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: width,
        height: height,
        backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent overlay
        zIndex: 15,
    },
    menuContainer: {
        position: 'absolute',
        bottom: TAB_HEIGHT + 30, // Raised higher (was +10)
        left: (width - 200) / 2, // Center horizontally
        width: 200,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    menuIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginHorizontal: 8,
    },
    menuArrow: {
        position: 'absolute',
        bottom: -8,
        left: 90, // Center of width 200 (100) - half arrow width (10)
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'white',
        shadowColor: "#000", // Shadow for arrow is tricky, simpler to ignore or use image
    },
});
