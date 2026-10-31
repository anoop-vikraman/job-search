import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { palette } from '@tweak/theme';
import { useChatUnreadCount } from '../../hooks/useChat';
import { useWallet } from '../../hooks/useWallet';
import { formatMinor } from '../../utils/money';
import { useTheme } from '../../themes/ThemeProvider';

interface HomeHeaderProps {
    currentAddress?: string;
    onLocationPress?: () => void;
}

export default function HomeHeader({ currentAddress = "Select Location", onLocationPress }: HomeHeaderProps): React.JSX.Element {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const isFocused = useIsFocused();
    const { data: chatUnread = 0 } = useChatUnreadCount({ poll: isFocused });
    const { data: wallet } = useWallet();

    return (
        <View className="px-4 pt-2 pb-4 bg-white dark:bg-slate-900 shadow-sm z-10">
            {/* Top Row: Location, Wallet, and Profile */}
            <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity
                    className="flex-row items-center flex-1 mr-2"
                    onPress={onLocationPress}
                >
                    <View className="p-2 bg-orange-100 rounded-full mr-3">
                        <Ionicons name="navigate" size={20} color={palette.orange500} />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text className="font-bold text-lg text-gray-900 dark:text-slate-50 mr-1">Home</Text>
                            <Ionicons name="chevron-down" size={16} color={isDark ? colors.text : palette.gray700} />
                        </View>
                        <Text numberOfLines={1} className="text-gray-500 dark:text-slate-400 text-sm">
                            {currentAddress}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Messages */}
                <TouchableOpacity
                    onPress={() => router.push('/chat' as Href)}
                    className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full mr-2"
                    accessibilityRole="button"
                    accessibilityLabel={chatUnread > 0 ? `Messages, ${chatUnread} unread` : 'Messages'}
                >
                    <Ionicons name="chatbubbles-outline" size={22} color={isDark ? colors.text : palette.gray700} />
                    {chatUnread > 0 && (
                        <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: palette.red500, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{chatUnread > 99 ? '99+' : chatUnread}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Wallet Balance */}
                <TouchableOpacity
                    onPress={() => router.push('/wallet')}
                    className="flex-row items-center bg-green-50 px-3 py-2 rounded-full mr-2 border border-green-200"
                >
                    <Ionicons name="wallet" size={16} color={palette.green600} />
                    <Text className="ml-1 font-bold text-green-700 text-sm">
                        {wallet ? formatMinor(wallet.balance_minor, wallet.currency) : '—'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/profile')}
                    className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full"
                    accessibilityRole="button"
                    accessibilityLabel="Open profile"
                >
                    <Ionicons name="person" size={24} color={isDark ? colors.text : palette.gray700} />
                </TouchableOpacity>
            </View>

            {/* Search Bar: opens the marketplace with its search box focused */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/(tabs)/apply', params: { focusSearch: String(Date.now()) } })}
                className="flex-row items-center bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-slate-700"
                accessibilityRole="search"
                accessibilityLabel="Search for services"
            >
                <Ionicons name="search" size={20} color={isDark ? colors.textMuted : palette.gray400} />
                <Text className="flex-1 ml-3 text-base" style={{ color: isDark ? colors.textMuted : palette.gray400 }}>
                    Search for Services
                </Text>
            </TouchableOpacity>
        </View>
    );
}
