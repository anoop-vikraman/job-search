import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { palette } from '@tweak/theme';
import { useTheme } from '../../themes/ThemeProvider';

interface MenuItem {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    route: string;
}

export default function ProfileMenuList(): React.JSX.Element {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();

    const supportItems: MenuItem[] = [
        { icon: 'people', label: t('profileMenu.invite'), route: '/invite' },
        { icon: 'help-circle', label: t('profileMenu.help'), route: '/help' },
        { icon: 'language', label: t('profileMenu.language'), route: '/settings/language' },
        { icon: 'notifications', label: t('profileMenu.notificationSettings'), route: '/settings/notifications' },
        { icon: 'ban', label: t('profileMenu.blockedUsers'), route: '/settings/blocked' },
        { icon: 'search', label: t('profileMenu.savedAlerts'), route: '/settings/alerts' },
    ];

    const legalItems: MenuItem[] = [
        { icon: 'document-text', label: t('profileMenu.terms'), route: '/settings/terms' },
        { icon: 'shield-checkmark', label: t('profileMenu.privacy'), route: '/settings/privacy' },
    ];

    const renderItem = (item: MenuItem) => (
        <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route as Href)}
            className="flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-slate-700"
        >
            <View className="flex-row items-center">
                <Ionicons name={item.icon} size={20} color={isDark ? colors.textSecondary : palette.gray500} />
                <Text className="ml-3 text-gray-700 dark:text-slate-300 font-medium">{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? colors.textMuted : palette.gray400} />
        </TouchableOpacity>
    );

    return (
        <View className="px-6 py-4">
            {/* Support Section */}
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 mb-4">
                <Text className="text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase mb-2">{t('profileMenu.support')}</Text>
                {supportItems.map(renderItem)}
            </View>

            {/* Legal Section */}
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <Text className="text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase mb-2">{t('profileMenu.legal')}</Text>
                {legalItems.map(renderItem)}
            </View>
        </View>
    );
}
