import { CATEGORIES, getCategoryMeta } from '@/constants/categories';
import { themeColors } from '@/themes/colors';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { FlatList, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Pressable } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import TabButton from '../../components/UI/TabButton';
import { FeatureFlags } from '../../constants/featureFlags';
import { Tweak, useTweaksStore } from '../../store/useTweaksStore';
import { useAuthStore } from '../../store/useAuthStore';
import { loadDraftIntoCreateStore } from '../../utils/draftLoader';
import TweakTile from '../../components/Tweak/TweakTile';

type TabType = 'my' | 'applied';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TweaksListing() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('my');
    const [showDrafts, setShowDrafts] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState({
        category: 'All',
        tweakType: 'All', // 'All' | 'in_person' | 'remote'
        schedulePreference: 'All', // 'All' | 'one_day' | 'deadline' | 'few_days'
    });
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'applied_at' | 'accepted_at'

    const { getMyTweaks, getAppliedTweaks, getDrafts } = useTweaksStore();
    const { user } = useAuthStore();
    const userId = user?.id || '';

    const tweaksData = useMemo(() => {
        let data: Tweak[] = [];
        if (showDrafts) {
            data = getDrafts(userId);
        } else {
            data = activeTab === 'my' ? getMyTweaks(userId) : getAppliedTweaks(userId);
        }

        // 1. Filter by Search Query (Category Name)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            data = data.filter(t => (t.category || '').toLowerCase().includes(query));
        }

        // 2. Apply Filters
        if (filters.category !== 'All') {
            data = data.filter(t => t.category === filters.category);
        }
        if (filters.tweakType !== 'All') {
            data = data.filter(t => t.tweakType === filters.tweakType);
        }
        if (filters.schedulePreference !== 'All') {
            data = data.filter(t => t.schedulePreference === filters.schedulePreference);
        }

        // 3. Apply Sorting
        data = [...data].sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
                case 'oldest':
                    return dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf();
                case 'applied_at':
                    return dayjs(b.appliedAt || 0).valueOf() - dayjs(a.appliedAt || 0).valueOf();
                case 'accepted_at':
                    return dayjs(b.acceptedAt || 0).valueOf() - dayjs(a.acceptedAt || 0).valueOf();
                default:
                    return 0;
            }
        });

        return data;
    }, [activeTab, showDrafts, searchQuery, filters, sortBy, getMyTweaks, getAppliedTweaks, getDrafts]);

    const handleTweakPress = (tweak: Tweak) => {
        if (tweak.status === 'draft') {
            loadDraftIntoCreateStore(tweak);
            router.push('/create-tweak/edit');
        } else {
            router.push(`/tweaks/${tweak.id}`);
        }
    };

    const draftsCount = getDrafts(userId).length;
    // Address shown on Created tab or in Drafts (both for onsite)
    const showAddress = !showDrafts && activeTab === 'my';

    const resetFilters = () => {
        setFilters({ category: 'All', tweakType: 'All', schedulePreference: 'All' });
        setSortBy('newest');
    };

    const activeFilterCount = Object.values(filters).filter(v => v !== 'All').length + (sortBy !== 'newest' ? 1 : 0);

    return (
        <ScreenWrapper>
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>
                        {showDrafts ? 'Drafts' : 'Tweaks'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowDrafts(!showDrafts)}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 12,
                            backgroundColor: showDrafts ? '#FEF3C7' : '#F1F5F9',
                        }}
                    >
                        <Ionicons
                            name={showDrafts ? 'close-circle' : 'document-text-outline'}
                            size={17}
                            color={showDrafts ? '#B45309' : '#64748B'}
                        />
                        <Text style={{ fontWeight: '600', fontSize: 13, color: showDrafts ? '#B45309' : '#334155' }}>
                            {showDrafts ? 'Close' : `Drafts (${draftsCount})`}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Search & Filter Bar */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <View style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F1F5F9',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        height: 44,
                    }}>
                        <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                        <TextInput
                            placeholder="Search category..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{ flex: 1, height: '100%', fontSize: 14, color: '#0F172A' }}
                            placeholderTextColor="#94A3B8"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        onPress={() => setIsFilterModalVisible(true)}
                        style={{
                            width: 44,
                            height: 44,
                            backgroundColor: activeFilterCount > 0 ? `${themeColors.primary}15` : '#F1F5F9',
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}
                    >
                        <Ionicons
                            name="options-outline"
                            size={20}
                            color={activeFilterCount > 0 ? themeColors.primary : '#64748B'}
                        />
                        {activeFilterCount > 0 && (
                            <View style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                backgroundColor: themeColors.primary,
                                borderRadius: 10,
                                minWidth: 18,
                                height: 18,
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingHorizontal: 4,
                                borderWidth: 2,
                                borderColor: '#fff'
                            }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                {!showDrafts && (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                        <TabButton
                            label="Created"
                            active={activeTab === 'my'}
                            onPress={() => {
                                setActiveTab('my');
                                if (sortBy === 'applied_at' || sortBy === 'accepted_at') setSortBy('newest');
                            }}
                            count={getMyTweaks(userId).length}
                        />
                        <TabButton
                            label="Applied"
                            active={activeTab === 'applied'}
                            onPress={() => setActiveTab('applied')}
                            count={getAppliedTweaks(userId).length}
                        />
                    </View>
                )}

                {/* List */}
                {FeatureFlags.USE_LOCAL_STORAGE_FOR_TWEAKS ? (
                    <FlatList
                        data={tweaksData}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        renderItem={({ item }) => (
                            <TweakTile
                                item={item}
                                onPress={() => handleTweakPress(item)}
                                showAddress={showAddress}
                                currentUserId={userId}
                                onViewApplicants={activeTab === 'my' && !showDrafts ? () => router.push(`/tweaks/${item.id}/applicants` as any) : undefined}
                            />
                        )}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                                <View style={{
                                    width: 64, height: 64,
                                    backgroundColor: '#F1F5F9',
                                    borderRadius: 32,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16,
                                }}>
                                    <Ionicons
                                        name={showDrafts ? 'document-text-outline' : 'hammer-outline'}
                                        size={30}
                                        color="#94A3B8"
                                    />
                                </View>
                                <Text style={{ color: '#64748B', fontWeight: '700', fontSize: 17 }}>
                                    {showDrafts ? 'No Drafts' : 'No Tweaks Yet'}
                                </Text>
                                <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 6, paddingHorizontal: 40, fontSize: 13 }}>
                                    {showDrafts
                                        ? 'Save a tweak as draft to see it here.'
                                        : 'Go to the Create tab to post your first tweak.'}
                                </Text>
                            </View>
                        }
                    />
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>Apply for Tweaks</Text>
                        <Text style={{ color: '#64748B', marginTop: 8 }}>Coming Soon (API Integration)</Text>
                    </View>
                )}
                {/* Filter Modal */}
                <Modal
                    visible={isFilterModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsFilterModalVisible(false)}
                >
                    <Pressable
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                        onPress={() => setIsFilterModalVisible(false)}
                    >
                        <Pressable
                            style={{
                                backgroundColor: '#fff',
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                                maxHeight: '85%',
                                paddingBottom: 30
                            }}
                        >
                            {/* Modal Header */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingHorizontal: 20,
                                paddingVertical: 18,
                                borderBottomWidth: 1,
                                borderBottomColor: '#F1F5F9'
                            }}>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Filters & Sort</Text>
                                <TouchableOpacity onPress={resetFilters}>
                                    <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Reset</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ padding: 20 }}>
                                {/* Sort Section */}
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sort By</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                                    {[
                                        { label: 'Newest First', value: 'newest' },
                                        { label: 'Oldest First', value: 'oldest' },
                                        ...(activeTab === 'applied' ? [
                                            { label: 'Recently Applied', value: 'applied_at' },
                                            { label: 'Recently Accepted', value: 'accepted_at' }
                                        ] : [])
                                    ].map(opt => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() => setSortBy(opt.value)}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                borderRadius: 20,
                                                backgroundColor: sortBy === opt.value ? themeColors.primary : '#F8FAFC',
                                                borderWidth: 1,
                                                borderColor: sortBy === opt.value ? themeColors.primary : '#E2E8F0'
                                            }}
                                        >
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: sortBy === opt.value ? '#fff' : '#475569' }}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Category Section */}
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                                    {['All', ...CATEGORIES.map(c => c.name)].map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            onPress={() => setFilters({ ...filters, category: cat })}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                borderRadius: 20,
                                                backgroundColor: filters.category === cat ? themeColors.primary : '#F8FAFC',
                                                borderWidth: 1,
                                                borderColor: filters.category === cat ? themeColors.primary : '#E2E8F0'
                                            }}
                                        >
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: filters.category === cat ? '#fff' : '#475569' }}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Type Section */}
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tweak Type</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                                    {[
                                        { label: 'All', value: 'All' },
                                        { label: 'Onsite', value: 'in_person' },
                                        { label: 'Remote', value: 'remote' }
                                    ].map(type => (
                                        <TouchableOpacity
                                            key={type.value}
                                            onPress={() => setFilters({ ...filters, tweakType: type.value })}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                borderRadius: 20,
                                                backgroundColor: filters.tweakType === type.value ? themeColors.primary : '#F8FAFC',
                                                borderWidth: 1,
                                                borderColor: filters.tweakType === type.value ? themeColors.primary : '#E2E8F0'
                                            }}
                                        >
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: filters.tweakType === type.value ? '#fff' : '#475569' }}>{type.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Schedule Section */}
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Schedule Type</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
                                    {[
                                        { label: 'All', value: 'All' },
                                        { label: 'Single Day', value: 'one_day' },
                                        { label: 'Deadline', value: 'deadline' },
                                        { label: 'Multi-Day', value: 'few_days' }
                                    ].map(s => (
                                        <TouchableOpacity
                                            key={s.value}
                                            onPress={() => setFilters({ ...filters, schedulePreference: s.value })}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                borderRadius: 20,
                                                backgroundColor: filters.schedulePreference === s.value ? themeColors.primary : '#F8FAFC',
                                                borderWidth: 1,
                                                borderColor: filters.schedulePreference === s.value ? themeColors.primary : '#E2E8F0'
                                            }}
                                        >
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: filters.schedulePreference === s.value ? '#fff' : '#475569' }}>{s.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            {/* Done Button */}
                            <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                                <TouchableOpacity
                                    onPress={() => setIsFilterModalVisible(false)}
                                    style={{
                                        backgroundColor: themeColors.primary,
                                        paddingVertical: 14,
                                        borderRadius: 14,
                                        alignItems: 'center'
                                    }}
                                >
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
