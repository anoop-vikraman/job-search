import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTweaksStore } from '@/store/useTweaksStore';

export default function TweakApplicants() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getTweakById } = useTweaksStore();
    const tweak = getTweakById(id as string);

    if (!tweak) {
        return (
            <ScreenWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#64748B' }}>Tweak not found.</Text>
                </View>
            </ScreenWrapper>
        );
    }

    const applicants = tweak.applications || [];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'accepted': return { bg: '#DCFCE7', text: '#15803D' };
            case 'rejected': return { bg: '#FEE2E2', text: '#B91C1C' };
            default: return { bg: '#F1F5F9', text: '#64748B' };
        }
    };

    return (
        <ScreenWrapper>
            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 16, paddingVertical: 14,
                backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
            }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>Applicants</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' }}>{tweak.category}</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            <FlatList
                data={applicants}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <Ionicons name="people-outline" size={32} color="#94A3B8" />
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#475569' }}>No applicants yet</Text>
                        <Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 }}>
                            When people apply to this tweak, they will appear here.
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const statusStyle = getStatusStyle(item.status);
                    return (
                        <TouchableOpacity
                            onPress={() => router.push(`/tweaks/${tweak.id}/applicants/${item.userId}` as any)}
                            activeOpacity={0.7}
                            style={{
                                backgroundColor: '#fff',
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            {/* Avatar */}
                            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                {item.profilePictureUrl ? (
                                    <Image source={{ uri: item.profilePictureUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                                ) : (
                                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#64748B' }}>
                                        {item.userName.charAt(0)}
                                    </Text>
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{item.userName}</Text>
                                    <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: statusStyle.text, textTransform: 'uppercase' }}>
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                                    <Text style={{ fontSize: 13, color: '#64748B' }}>Quote:</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#007AFF' }}>
                                        ₹{item.quotedPrice || (tweak.pricingData?.price || tweak.price || '—')}
                                    </Text>
                                </View>

                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                    {item.userSkills.slice(0, 2).map((skill, idx) => (
                                        <View key={idx} style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                            <Text style={{ fontSize: 10, color: '#475569' }}>{skill}</Text>
                                        </View>
                                    ))}
                                    {item.userSkills.length > 2 && (
                                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>+{item.userSkills.length - 2} more</Text>
                                    )}
                                </View>
                            </View>

                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </ScreenWrapper>
    );
}
