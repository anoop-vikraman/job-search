import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette } from '@tweak/theme';

import { useCreateTweakStore } from '../../store/useCreateTweakStore';

const { width, height } = Dimensions.get('window');
const TAB_HEIGHT = 80;
const CENTER_BUTTON_RADIUS = 28; // Smaller button (was 35)

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const setTweakType = useCreateTweakStore((state) => state.setTweakType);
    const reset = useCreateTweakStore((state) => state.reset);

    const handleCreateSelect = (type: 'remote' | 'in_person') => {
        setIsMenuOpen(false);
        reset();

        if (type === 'in_person') {
            // Navigate to location selection first for Onsite
            // We don't set type yet? Or set it and let location-entry handle it? 
            // location-entry sets type to 'in_person' on selection.
            // But if we want to be safe, we can set it here too.
            setTweakType('in_person');
            router.push('/create-tweak/location-entry');
        } else {
            // Remote: go straight to category
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

    return (
        <View style={styles.container}>
            <Svg width={width} height={TAB_HEIGHT} style={styles.svg}>
                <Path d={getPath()} fill="white" stroke={palette.gray200} strokeWidth={1} />
            </Svg>

            <View style={styles.content}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    // Spacer for Create (Center) to separate Tweaks and Jobs
                    if (route.name === 'create') {
                        return <View key={route.key} style={{ width: 60 }} />;
                    }
                    // Hidden tabs
                    if (route.name === 'invite' || route.name === 'offers') return null;

                    // Arrange render
                    // Left: Home(0), Tweaks(1)
                    if (index < 2) {
                        return (
                            <TabItem
                                key={route.key}
                                name={route.name}
                                options={options}
                                isFocused={isFocused}
                                onPress={onPress}
                            />
                        );
                    }

                    // Right: Jobs(3), Alerts(4)
                    if (index > 2) {
                        return (
                            <TabItem
                                key={route.key}
                                name={route.name}
                                options={options}
                                isFocused={isFocused}
                                onPress={onPress}
                            />
                        );
                    }

                    return null;
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
                        <View style={[styles.menuIconContainer, { backgroundColor: palette.blue100 }]}>
                            <Ionicons name="laptop-outline" size={20} color={palette.blue500} />
                        </View>
                        <Text style={styles.menuText}>Remote Tweak</Text>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleCreateSelect('in_person')}
                    >
                        <View style={[styles.menuIconContainer, { backgroundColor: palette.orange100 }]}>
                            <Ionicons name="location" size={20} color={palette.orange500} />
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
                accessibilityRole="button"
                accessibilityLabel={isMenuOpen ? "Close create menu" : "Create tweak"}
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

interface TabItemProps {
    name: string;
    options: BottomTabBarProps['descriptors'][string]['options'];
    isFocused: boolean;
    onPress: () => void;
}

const TabItem = ({ name, options, isFocused, onPress }: TabItemProps) => {
    let iconName: keyof typeof Ionicons.glyphMap = 'help';
    let label = 'Tab';

    if (name === 'jobs') {
        iconName = isFocused ? 'briefcase' : 'briefcase-outline';
        label = 'Jobs';
    } else if (name === 'tweaks') {
        iconName = isFocused ? 'list' : 'list-outline';
        label = 'Tweaks';
    } else if (name === 'index') {
        iconName = isFocused ? 'home' : 'home-outline';
        label = 'Home';
    } else if (name === 'notifications') {
        iconName = isFocused ? 'notifications' : 'notifications-outline';
        label = 'Alerts';
    }

    return (
        <TouchableOpacity onPress={onPress} style={styles.tabItem}>
            <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? palette.violet600 : palette.gray400}
            />
            <Text style={[
                styles.tabLabel,
                { color: isFocused ? palette.violet600 : palette.gray400 }
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
        shadowColor: palette.black,
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
        backgroundColor: palette.violet600,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: palette.violet600,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 4,
        borderColor: palette.gray100,
        zIndex: 20,
    },
    centerButtonActive: {
        transform: [{ rotate: '45deg' }],
        backgroundColor: palette.violet700,
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
        shadowColor: palette.black,
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
        color: palette.gray800,
    },
    menuDivider: {
        height: 1,
        backgroundColor: palette.gray100,
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
        shadowColor: palette.black, // Shadow for arrow is tricky, simpler to ignore or use image
    },
});
