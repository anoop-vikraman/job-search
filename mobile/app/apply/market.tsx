import { CATEGORIES } from '@/constants/categories';
import { themeColors } from '@/themes/colors';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useAuthStore } from '../../store/useAuthStore';
import { useTweaksFeed } from '../../hooks/useTweaks';
import TweakTile from '../../components/Tweak/TweakTile';
import { useTheme } from '@/themes/ThemeProvider';



export default function MarketPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const userId = user?.id || '';
    const { data: feedTweaks = [] } = useTweaksFeed();

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState({
        category: 'All',
        tweakType: 'All',
        schedulePreference: 'All',
    });
    const [sortBy, setSortBy] = useState('newest');

    const marketTweaks = useMemo(() => {
        // Exclude the current user's own tweaks; only show active ones.
        let data = feedTweaks.filter((t) => t.createdByUserId !== userId && t.status === 'active');

        // Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            data = data.filter(t => (t.category || '').toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query));
        }

        // Filter
        if (filters.category !== 'All') data = data.filter(t => t.category === filters.category);
        if (filters.tweakType !== 'All') data = data.filter(t => t.tweakType === filters.tweakType);
        if (filters.schedulePreference !== 'All') data = data.filter(t => t.schedulePreference === filters.schedulePreference);

        // Sort
        data = [...data].sort((a, b) => {
            if (sortBy === 'newest') return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
            if (sortBy === 'oldest') return dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf();
            return 0;
        });

        return data;
    }, [feedTweaks, userId, searchQuery, filters, sortBy]);

    const activeFilterCount = Object.values(filters).filter(v => v !== 'All').length + (sortBy !== 'newest' ? 1 : 0);

    return (
        <ScreenWrapper>
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
                {/* Header */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Find Tweaks</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>Browse available tasks near you</Text>
                </View>

                {/* Search & Filter */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, height: 44 }}>
                        <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            placeholder="Search tweaks..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{ flex: 1, height: '100%', fontSize: 14, color: colors.text }}
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={() => setIsFilterModalVisible(true)}
                        style={{ width: 44, height: 44, backgroundColor: activeFilterCount > 0 ? `${themeColors.primary}15` : colors.surfaceMuted, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                        accessibilityRole="button"
                        accessibilityLabel="Filter"
                    >
                        <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? themeColors.primary : colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Market List */}
                <FlatList
                    data={marketTweaks}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    renderItem={({ item }) => (
                        <TweakTile
                            item={item}
                            onPress={() => router.push(`/tweaks/${item.id}`)}
                            currentUserId={userId}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 100 }}>
                            <Ionicons name="search" size={48} color={colors.textMuted} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginTop: 12 }}>No tweaks found</Text>
                            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Try adjusting your search or filters</Text>
                        </View>
                    }
                />

                {/* Simple Filter Modal (Placeholder for logic) */}
                <Modal visible={isFilterModalVisible} animationType="slide" transparent={true}>
                    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setIsFilterModalVisible(false)}>
                        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 20, color: colors.text }}>Filters</Text>
                            <TouchableOpacity
                                onPress={() => { setIsFilterModalVisible(false); setFilters({ category: 'All', tweakType: 'All', schedulePreference: 'All' }); setSortBy('newest'); }}
                                style={{ backgroundColor: colors.surfaceMuted, padding: 14, borderRadius: 12, alignItems: 'center' }}
                            >
                                <Text style={{ fontWeight: '700', color: colors.textSecondary }}>Reset All Filters</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={{ backgroundColor: themeColors.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 }}>
                                <Text style={{ fontWeight: '800', color: '#fff' }}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Modal>
            </View>
        </ScreenWrapper>
    );
}
