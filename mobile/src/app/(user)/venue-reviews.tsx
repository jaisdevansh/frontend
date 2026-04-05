import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    Dimensions,
    Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useStrictBack } from '../../hooks/useStrictBack';

const { width } = Dimensions.get('window');

const FILTERS = ['Recent', 'Highest Rated', 'With Photos', 'Lowest Rated'];

const MOCK_REVIEWS = [
    {
        id: '1',
        name: 'Elena Rodriguez',
        tag: 'PLATINUM MEMBER',
        time: '1W AGO',
        stars: 5,
        review: 'The amenities here are unmatched. The VIP service was seamless from entry to table. Truly an elite nightlife experience. Highly recommend the mezzanine booths.',
        chips: ['HIGH ENERGY VIBE', 'GREAT DRINKS'],
        photos: [
            'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&q=80&w=400',
            'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=400'
        ],
        helpful: 34,
        avatar: 'https://i.pravatar.cc/150?u=elena'
    },
    {
        id: '2',
        name: 'Alexander Vess',
        tag: 'GOLD MEMBER',
        time: '3W AGO',
        stars: 4,
        review: 'Great vibe, though the wait for the bar was longer than expected for gold tier. Once served, the cocktails were exceptional. Definitely coming back for the Sunday brunch series.',
        chips: ['GOOD MUSIC', 'PERFECT FOR AFTER PARTIES'],
        photos: [],
        helpful: 12,
        avatar: 'https://i.pravatar.cc/150?u=alex'
    },
    {
        id: '3',
        name: 'Jullian Marks',
        tag: 'MEMBER',
        time: 'YESTERDAY',
        stars: 5,
        review: 'Unbelievable sound system. The best bass in the city.',
        chips: [],
        photos: [],
        helpful: 2,
        avatar: 'https://i.pravatar.cc/150?u=jual'
    }
];

export default function VenueReviews() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const goBack = useStrictBack();

    const venueName = (params.name as string) || 'THE NEON LOUNGE';
    const [activeFilter, setActiveFilter] = useState('Recent');

    return (
        <SafeAreaView style={styles.container}>
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.iconBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerTextCol}>
                    <Text style={styles.headerTitle}>{venueName.toUpperCase()}</Text>
                    <Text style={styles.headerSubtitle}>REVIEWS</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/(user)/write-review', params: { name: venueName } })}>
                    <Ionicons name="create-outline" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Aggregate Summary */}
                <View style={styles.summarySection}>
                    <View style={styles.summaryLeft}>
                        <Text style={styles.scoreText}>4.9</Text>
                        <View style={styles.starsRow}>
                            {[...Array(5)].map((_, i) => (
                                <Ionicons key={i} name="star" size={16} color="#7c4dff" style={{ marginHorizontal: 2 }} />
                            ))}
                        </View>
                        <Text style={styles.memberCountText}>From 2,648 elite members</Text>
                    </View>

                    <View style={styles.summaryRight}>
                        {/* Fake graphical bars */}
                        {[
                            { num: 5, p: '90%' },
                            { num: 4, p: '15%' },
                            { num: 3, p: '2%' },
                            { num: 2, p: '0%' },
                            { num: 1, p: '0%' }
                        ].map(bar => (
                            <View key={bar.num} style={styles.graphRow}>
                                <Text style={styles.graphNum}>{bar.num}</Text>
                                <View style={styles.graphTrack}>
                                    <View style={[styles.graphFill, { width: bar.p as any }]} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
                    {FILTERS.map(f => (
                        <TouchableOpacity 
                            key={f} 
                            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                            onPress={() => setActiveFilter(f)}
                        >
                            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Reviews List */}
                <View style={styles.reviewsList}>
                    {MOCK_REVIEWS.map(item => (
                        <View key={item.id} style={styles.reviewCard}>
                            <View style={styles.rHeader}>
                                <Image source={{ uri: item.avatar }} style={styles.rAvatar} />
                                <View style={styles.rDetails}>
                                    <Text style={styles.rName}>{item.name}</Text>
                                    <View style={styles.rTagRow}>
                                        <Text style={styles.rTagText}>{item.tag}</Text>
                                        <Ionicons name="shield-checkmark" size={10} color="#7c4dff" style={{ marginLeft: 4 }} />
                                    </View>
                                </View>
                                <Text style={styles.rTime}>{item.time}</Text>
                            </View>

                            <View style={styles.rStars}>
                                {[...Array(5)].map((_, i) => (
                                    <Ionicons 
                                        key={i} 
                                        name="star" 
                                        size={12} 
                                        color={i < item.stars ? '#7c4dff' : 'rgba(255,255,255,0.1)'} 
                                        style={{ marginRight: 2 }} 
                                    />
                                ))}
                            </View>

                            {item.chips && item.chips.length > 0 && (
                                <View style={styles.rChips}>
                                    {item.chips.map(c => (
                                        <View key={c} style={styles.rChipBody}>
                                            <Ionicons name="sparkles" size={10} color="#7c4dff" style={{ marginRight: 4 }} />
                                            <Text style={styles.rChipText}>{c}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.rContent}>{item.review}</Text>

                            {item.photos && item.photos.length > 0 && (
                                <View style={styles.rPhotos}>
                                    {item.photos.map((p, idx) => (
                                        <Image key={idx} source={{ uri: p }} style={styles.rPhotoImg} />
                                    ))}
                                </View>
                            )}

                            <View style={styles.rFooter}>
                                <TouchableOpacity style={styles.rActionBtn}>
                                    <Ionicons name="thumbs-up" size={14} color="#6b7280" />
                                    <Text style={styles.rActionText}>HELPFUL ({item.helpful})</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.rActionBtn}>
                                    <Ionicons name="arrow-undo-outline" size={14} color="#6b7280" />
                                    <Text style={styles.rActionText}>REPLY</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Bottom spacer for floating button */}
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.floatingBtnContainer}>
                <TouchableOpacity 
                    style={styles.floatingBtn}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/(user)/write-review', params: { name: venueName } })}
                >
                    <Ionicons name="create" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.floatingBtnText}>WRITE REVIEW</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    iconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextCol: {
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: '#7c4dff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginTop: 2,
    },
    scrollContent: {
        paddingTop: 20,
    },
    summarySection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 30,
    },
    summaryLeft: {
        flex: 1,
    },
    scoreText: {
        color: '#FFF',
        fontSize: 48,
        fontWeight: '900',
        lineHeight: 52,
    },
    starsRow: {
        flexDirection: 'row',
        marginTop: 4,
        marginBottom: 8,
    },
    memberCountText: {
        color: '#6b7280',
        fontSize: 12,
        fontWeight: '500',
    },
    summaryRight: {
        width: 140,
        justifyContent: 'center',
    },
    graphRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    graphNum: {
        color: '#6b7280',
        fontSize: 10,
        fontWeight: '700',
        width: 12,
    },
    graphTrack: {
        flex: 1,
        height: 4,
        backgroundColor: '#1E1E2A',
        borderRadius: 2,
        marginLeft: 8,
        overflow: 'hidden',
    },
    graphFill: {
        height: '100%',
        backgroundColor: '#7c4dff',
        borderRadius: 2,
    },
    filterScroll: {
        marginBottom: 20,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#111116',
        borderWidth: 1,
        borderColor: '#1f1f2e',
    },
    filterChipActive: {
        backgroundColor: '#7c4dff',
        borderColor: '#7c4dff',
    },
    filterText: {
        color: '#888',
        fontSize: 13,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#FFF',
    },
    reviewsList: {
        paddingHorizontal: 20,
        gap: 20,
    },
    reviewCard: {
        backgroundColor: '#111116',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1f1f2e',
    },
    rHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    rAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    rDetails: {
        flex: 1,
        marginLeft: 12,
    },
    rName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    rTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rTagText: {
        color: '#7c4dff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    rTime: {
        color: '#6b7280',
        fontSize: 10,
        fontWeight: '700',
    },
    rStars: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    rChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    rChipBody: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(124, 77, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    rChipText: {
        color: '#7c4dff',
        fontSize: 10,
        fontWeight: '700',
    },
    rContent: {
        color: '#d1d5db',
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 16,
    },
    rPhotos: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    rPhotoImg: {
        width: 120,
        height: 80,
        borderRadius: 12,
    },
    rFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 16,
    },
    rActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rActionText: {
        color: '#6b7280',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    floatingBtnContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    floatingBtn: {
        flexDirection: 'row',
        backgroundColor: '#7c4dff',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#7c4dff',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    floatingBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    }
});
