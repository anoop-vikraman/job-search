import { CATEGORIES } from '@/constants/categories';
import { themeColors } from '@/themes/colors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View, type TextStyle, type ViewStyle } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Toast } from '../../components/UI/ToastManager';
import { useAuthStore } from '../../store/useAuthStore';
import { useTweaksFeed, type TweakFeedFilters } from '../../hooks/useTweaks';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { FeedSort, SavedSearchCreate } from '../../types/api';
import { describeSavedSearch, useCreateSavedSearch } from '../../hooks/useSavedSearches';
import TweakTile from '../../components/Tweak/TweakTile';
import TweakMap from '../../components/Tweak/TweakMap';
import { track } from '../../utils/analytics';
import { useTheme } from '@/themes/ThemeProvider';

const SORT_OPTIONS: { label: string; value: FeedSort; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'Newest', value: 'newest', icon: 'time-outline' },
    { label: 'Nearest', value: 'distance', icon: 'navigate-outline' },
    { label: 'Price ↑', value: 'price_asc', icon: 'trending-up-outline' },
    { label: 'Price ↓', value: 'price_desc', icon: 'trending-down-outline' },
];

const RADIUS_OPTIONS: { label: string; value: number | null }[] = [
    { label: 'Any', value: null },
    { label: '5 km', value: 5 },
    { label: '10 km', value: 10 },
    { label: '25 km', value: 25 },
    { label: '50 km', value: 50 },
];

const DEFAULT_RADIUS_KM = 25;

interface ClientFilters {
    category: string;
    tweakType: string;
    schedulePreference: string;
}

const DEFAULT_FILTERS: ClientFilters = { category: 'All', tweakType: 'All', schedulePreference: 'All' };

export default function MarketPage(): React.JSX.Element {
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const userId = user?.id || '';

    // The home search bar navigates here with a fresh `focusSearch` value each tap.
    const { focusSearch } = useLocalSearchParams<{ focusSearch?: string }>();
    const searchInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
    useEffect(() => {
        if (!focusSearch) return;
        const timer = setTimeout(() => searchInputRef.current?.focus(), 250);
        return () => clearTimeout(timer);
    }, [focusSearch]);

    // Search, sort & location (server-side)
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery.trim());
    const [sortBy, setSortBy] = useState<FeedSort>('newest');
    const [nearMe, setNearMe] = useState(false);
    const [radiusKm, setRadiusKm] = useState<number | null>(DEFAULT_RADIUS_KM);
    const location = useCurrentLocation();
    const coords = nearMe ? location.coords : null;

    // Filters (category and type server-side; schedule client-side on the loaded pages)
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState<ClientFilters>(DEFAULT_FILTERS);

    const feedFilters = useMemo<TweakFeedFilters>(
        () => ({
            search: debouncedSearch || undefined,
            category: filters.category !== 'All' ? filters.category : undefined,
            tweak_type: filters.tweakType === 'in_person' || filters.tweakType === 'remote' ? filters.tweakType : undefined,
            sort: sortBy === 'distance' && !coords ? 'newest' : sortBy,
            ...(coords
                ? { lat: coords.lat, lng: coords.lng, radius_km: radiusKm ?? undefined }
                : {}),
        }),
        [debouncedSearch, filters.category, filters.tweakType, sortBy, coords, radiusKm]
    );

    const feed = useTweaksFeed(feedFilters);
    useEffect(() => {
        if (debouncedSearch) track('search_performed', { length: debouncedSearch.length, near_me: Boolean(coords) });
    }, [debouncedSearch, coords]);
    const { tweaks: feedTweaks, isFetching, isRefetching, isFetchingNextPage, refetch } = feed;

    const marketTweaks = useMemo(() => {
        let data = feedTweaks.filter((t) => t.createdByUserId !== userId);
        if (filters.schedulePreference !== 'All') data = data.filter((t) => t.schedulePreference === filters.schedulePreference);
        return data;
    }, [feedTweaks, userId, filters.schedulePreference]);

    const enableNearMe = async (): Promise<boolean> => {
        setNearMe(true);
        const result = await location.locate();
        if (result.error) {
            setNearMe(false);
            Toast.warning(
                result.error === 'denied'
                    ? 'Allow location access to see tweaks near you.'
                    : 'Could not get your location. Please try again.'
            );
            return false;
        }
        return true;
    };

    const toggleNearMe = async (): Promise<void> => {
        if (nearMe) {
            setNearMe(false);
            location.clear();
            if (sortBy === 'distance') setSortBy('newest');
            return;
        }
        if (await enableNearMe()) setSortBy('distance');
    };

    const selectSort = async (value: FeedSort): Promise<void> => {
        if (value === 'distance' && !nearMe && !(await enableNearMe())) return;
        setSortBy(value);
    };

    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // ─── Saved search alert ──────────────────────────────────────────────
    const createSaved = useCreateSavedSearch();
    const [saveOpen, setSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const savable: SavedSearchCreate = {
        name: saveName.trim(),
        search: feedFilters.search,
        category: feedFilters.category,
        tweak_type: feedFilters.tweak_type,
        ...(coords && radiusKm != null ? { lat: coords.lat, lng: coords.lng, radius_km: radiusKm } : {}),
    };
    const hasSavableFilters = Boolean(savable.search || savable.category || savable.tweak_type || savable.radius_km);

    const openSaveSheet = (): void => {
        if (!hasSavableFilters) {
            Toast.info('Search or pick a category, type or distance first, then save it as an alert.');
            return;
        }
        setSaveName(savable.search ?? savable.category ?? 'Nearby tweaks');
        setSaveOpen(true);
    };

    const saveAlert = (): void => {
        if (!savable.name) return;
        createSaved.mutate(savable, {
            onSuccess: () => {
                setSaveOpen(false);
                Toast.success("Alert saved. We'll notify you about new matching tweaks.");
            },
        });
    };

    const resetFilters = (): void => {
        setFilters(DEFAULT_FILTERS);
        setRadiusKm(DEFAULT_RADIUS_KM);
    };

    const activeFilterCount =
        Object.values(filters).filter((v) => v !== 'All').length +
        (nearMe && radiusKm !== DEFAULT_RADIUS_KM ? 1 : 0);

    const subtitle = coords
        ? radiusKm != null
            ? `Within ${radiusKm} km of you`
            : 'Sorted by distance from you'
        : 'Browse available tasks';

    const chip = (active: boolean): ViewStyle => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: active ? themeColors.primary : colors.surfaceMuted,
        borderWidth: 1,
        borderColor: active ? themeColors.primary : colors.border,
    });
    const chipText = (active: boolean): TextStyle => ({
        fontSize: 13,
        fontWeight: '600',
        color: active ? '#fff' : colors.textSecondary,
    });
    const sectionLabel: TextStyle = {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    };

    return (
        <ScreenWrapper>
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
                {/* Header */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Find Tweaks</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>
                </View>

                {/* Search & Filter */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, height: 44 }}>
                        <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            ref={searchInputRef}
                            placeholder="Search title, skill or category..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                            autoCorrect={false}
                            maxLength={100}
                            style={{ flex: 1, height: '100%', fontSize: 14, color: colors.text }}
                            placeholderTextColor={colors.textMuted}
                        />
                        {isFetching && !isRefetching && !isFetchingNextPage ? (
                            <ActivityIndicator size="small" color={colors.textMuted} />
                        ) : searchQuery.length > 0 ? (
                            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
                                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <TouchableOpacity
                        onPress={openSaveSheet}
                        style={{ width: 44, height: 44, backgroundColor: colors.surfaceMuted, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                        accessibilityRole="button"
                        accessibilityLabel="Save this search as an alert"
                    >
                        <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setIsFilterModalVisible(true)}
                        style={{ width: 44, height: 44, backgroundColor: activeFilterCount > 0 ? `${themeColors.primary}15` : colors.surfaceMuted, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                        accessibilityRole="button"
                        accessibilityLabel="Filter"
                    >
                        <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? themeColors.primary : colors.textSecondary} />
                        {activeFilterCount > 0 && (
                            <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: themeColors.primary, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.surface }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Near me + sort */}
                <View style={{ marginBottom: 14 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        <TouchableOpacity
                            onPress={toggleNearMe}
                            style={chip(nearMe)}
                            accessibilityRole="switch"
                            accessibilityState={{ checked: nearMe }}
                            accessibilityLabel="Near me"
                        >
                            {location.status === 'locating' ? (
                                <ActivityIndicator size="small" color={nearMe ? '#fff' : colors.textSecondary} />
                            ) : (
                                <Ionicons name="locate-outline" size={14} color={nearMe ? '#fff' : colors.textSecondary} />
                            )}
                            <Text style={chipText(nearMe)}>Near me</Text>
                        </TouchableOpacity>
                        <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                        {SORT_OPTIONS.map((opt) => {
                            const active = sortBy === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    onPress={() => selectSort(opt.value)}
                                    style={chip(active)}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: active }}
                                >
                                    <Ionicons name={opt.icon} size={13} color={active ? '#fff' : colors.textSecondary} />
                                    <Text style={chipText(active)}>{opt.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* List / map toggle */}
                <View style={{ flexDirection: 'row', alignSelf: 'flex-end', backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 3, marginBottom: 10 }}>
                    {(['list', 'map'] as const).map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            onPress={() => setViewMode(mode)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: viewMode === mode ? colors.surface : 'transparent' }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: viewMode === mode }}
                        >
                            <Ionicons name={mode === 'list' ? 'list-outline' : 'map-outline'} size={14} color={viewMode === mode ? colors.text : colors.textMuted} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === mode ? colors.text : colors.textMuted }}>{mode === 'list' ? 'List' : 'Map'}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Market List / Map */}
                {viewMode === 'map' ? (
                    <TweakMap
                        tweaks={marketTweaks}
                        center={coords}
                        radiusKm={coords ? radiusKm : null}
                        onOpen={(tweakId) => router.push(`/tweaks/${tweakId}`)}
                    />
                ) : (
                <FlatList
                    data={marketTweaks}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshing={isRefetching}
                    onRefresh={refetch}
                    onEndReached={feed.loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View style={{ paddingVertical: 16 }}>
                                <ActivityIndicator color={colors.textMuted} />
                            </View>
                        ) : undefined
                    }
                    renderItem={({ item }) => (
                        <TweakTile
                            item={item}
                            onPress={() => router.push(`/tweaks/${item.id}`)}
                            currentUserId={userId}
                        />
                    )}
                    ListEmptyComponent={
                        isFetching ? undefined : (
                            <View style={{ alignItems: 'center', marginTop: 100 }}>
                                <Ionicons name={coords ? 'navigate-outline' : 'search'} size={48} color={colors.textMuted} />
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginTop: 12 }}>No tweaks found</Text>
                                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
                                    {coords && radiusKm != null
                                        ? 'Try a larger distance or a different search.'
                                        : 'Try adjusting your search or filters'}
                                </Text>
                            </View>
                        )
                    }
                />

                )}

                {/* Save alert sheet */}
                <Modal visible={saveOpen} transparent animationType="slide" onRequestClose={() => setSaveOpen(false)}>
                    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setSaveOpen(false)}>
                        <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Get alerts for this search</Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 12 }}>
                                {describeSavedSearch({
                                    search: savable.search ?? null,
                                    category: savable.category ?? null,
                                    tweak_type: savable.tweak_type ?? null,
                                    radius_km: savable.radius_km ?? null,
                                })}
                            </Text>
                            <TextInput
                                value={saveName}
                                onChangeText={setSaveName}
                                placeholder="Alert name"
                                placeholderTextColor={colors.textMuted}
                                maxLength={80}
                                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceMuted }}
                            />
                            <TouchableOpacity
                                onPress={saveAlert}
                                disabled={!savable.name || createSaved.isPending}
                                style={{ marginTop: 16, backgroundColor: themeColors.primary, opacity: !savable.name || createSaved.isPending ? 0.5 : 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
                                accessibilityRole="button"
                            >
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Save alert</Text>
                            </TouchableOpacity>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Filter Modal */}
                <Modal
                    visible={isFilterModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsFilterModalVisible(false)}
                >
                    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setIsFilterModalVisible(false)}>
                        <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 30 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Filters</Text>
                                <TouchableOpacity onPress={resetFilters}>
                                    <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Reset</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ padding: 20 }}>
                                {/* Distance */}
                                <Text style={sectionLabel}>Distance</Text>
                                {nearMe ? (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                                        {RADIUS_OPTIONS.map((opt) => (
                                            <TouchableOpacity key={opt.label} onPress={() => setRadiusKm(opt.value)} style={chip(radiusKm === opt.value)}>
                                                <Text style={chipText(radiusKm === opt.value)}>{opt.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <TouchableOpacity onPress={toggleNearMe} style={[chip(false), { alignSelf: 'flex-start', marginBottom: 24 }]}>
                                        <Ionicons name="locate-outline" size={14} color={colors.textSecondary} />
                                        <Text style={chipText(false)}>Turn on Near me to filter by distance</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Category */}
                                <Text style={sectionLabel}>Category</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                                    {['All', ...CATEGORIES.map((c) => c.name)].map((cat) => (
                                        <TouchableOpacity key={cat} onPress={() => setFilters({ ...filters, category: cat })} style={chip(filters.category === cat)}>
                                            <Text style={chipText(filters.category === cat)}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Type */}
                                <Text style={sectionLabel}>Tweak Type</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                                    {[
                                        { label: 'All', value: 'All' },
                                        { label: 'Onsite', value: 'in_person' },
                                        { label: 'Remote', value: 'remote' },
                                    ].map((type) => (
                                        <TouchableOpacity key={type.value} onPress={() => setFilters({ ...filters, tweakType: type.value })} style={chip(filters.tweakType === type.value)}>
                                            <Text style={chipText(filters.tweakType === type.value)}>{type.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Schedule */}
                                <Text style={sectionLabel}>Schedule Type</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
                                    {[
                                        { label: 'All', value: 'All' },
                                        { label: 'Single Day', value: 'one_day' },
                                        { label: 'Deadline', value: 'deadline' },
                                        { label: 'Multi-Day', value: 'few_days' },
                                    ].map((s) => (
                                        <TouchableOpacity key={s.value} onPress={() => setFilters({ ...filters, schedulePreference: s.value })} style={chip(filters.schedulePreference === s.value)}>
                                            <Text style={chipText(filters.schedulePreference === s.value)}>{s.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                                <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={{ backgroundColor: themeColors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Apply Filters</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            </View>
        </ScreenWrapper>
    );
}
