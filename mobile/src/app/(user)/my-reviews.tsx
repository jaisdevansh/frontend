import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { COLORS, BORDER_RADIUS, SPACING } from '../../constants/design-system';
import { useStrictBack } from '../../hooks/useStrictBack';
import { LinearGradient } from 'expo-linear-gradient';

const MOCK_REVIEWS = [
    {
        id: '1',
        venueName: 'Neon Noir Afterparty',
        image: 'https://images.unsplash.com/photo-1572297597525-2ab1eeb4113e?auto=format&fit=crop&q=80&w=800',
        rating: 5,
        date: 'Oct 12, 2023',
        xp: '+150 XP',
        text: '"The sound system was incredible and the VIP service was seamless. Truly a premium experience in the heart of the city."',
        vibe: 9,
        service: 10,
        music: 10,
    },
    {
        id: '2',
        venueName: 'Karma Club',
        image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=800',
        rating: 4,
        date: 'Sep 28, 2023',
        xp: '+120 XP',
        text: '"Great atmosphere and cocktails. The entry queue was a bit long even with priority booking, but once inside it was worth it."',
        vibe: 8,
        service: 7,
        music: 9,
    },
    {
        id: '3',
        venueName: 'The Zenith Rooftop',
        image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&q=80&w=800',
        rating: 5,
        date: 'Aug 15, 2023',
        xp: '+150 XP',
        text: '"Unbeatable views. The mixologists really know their craft. Highly recommend the Purple Rain signature cocktail."',
        vibe: 10,
        service: 9,
        music: 8,
    }
];

export default function MyReviews() {
    const router = useRouter();
    const goBack = useStrictBack('/(user)/profile');
    const [reviews] = useState(MOCK_REVIEWS);

    const handleShare = async (venueName: string) => {
        try {
            await Share.share({
                message: `Check out my elite review for ${venueName} on Entry Club! Join now: https://entryclub.com`,
            });
        } catch (error) {
            // Silent error
        }
    };


    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Reviews</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* XP Contribution Card */}
                <LinearGradient
                    colors={['#7C3AED', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <Text style={styles.heroLabel}>TOTAL CONTRIBUTION</Text>
                    <View style={styles.xpRow}>
                        <Text style={styles.heroXp}>2,450</Text>
                        <Text style={styles.heroXpSuffix}>XP</Text>
                    </View>

                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: '65%' }]} />
                    </View>
                    <Text style={styles.heroHint}>850 XP until Diamond Status</Text>
                </LinearGradient>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <Text style={styles.sectionFilter}>FILTERED BY DATE</Text>
                </View>

                {reviews.map((item) => (
                    <View key={item.id} style={styles.reviewCard}>
                        {/* Header: User Image, Name, Score, Stars */}
                        <View style={styles.cardHeader}>
                            <Image source={{ uri: item.image }} style={styles.venueImage} contentFit="cover" />
                            <View style={styles.venueInfo}>
                                <Text style={styles.venueName} numberOfLines={1}>{item.venueName}</Text>
                                <View style={styles.metaRow}>
                                    <View style={styles.stars}>
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Ionicons 
                                                key={s} 
                                                name="star" 
                                                size={12} 
                                                color={s <= item.rating ? '#7C3AED' : 'rgba(255,255,255,0.1)'} 
                                            />
                                        ))}
                                    </View>
                                    <Text style={styles.dateText}>{item.date}</Text>
                                </View>
                            </View>
                            <View style={styles.xpBadge}>
                                <Text style={styles.xpBadgeText}>{item.xp}</Text>
                            </View>
                        </View>

                        {/* Review Content */}
                        <Text style={styles.reviewText}>{item.text}</Text>

                        {/* Actions */}
                        <View style={styles.actionRow}>

                            <TouchableOpacity 
                                style={styles.shareBtn} 
                                onPress={() => handleShare(item.venueName)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="share-social" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
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
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    xpRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 24,
    },
    heroXp: {
        color: '#FFFFFF',
        fontSize: 40,
        fontWeight: '900',
    },
    heroXpSuffix: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 18,
        fontWeight: '700',
    },
    progressTrack: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        marginBottom: 10,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 3,
    },
    heroHint: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    sectionFilter: {
        color: '#7C3AED',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    reviewCard: {
        backgroundColor: '#16161E',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    venueImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    venueInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    venueName: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stars: {
        flexDirection: 'row',
        gap: 2,
    },
    dateText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: '600',
    },
    xpBadge: {
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.3)',
    },
    xpBadgeText: {
        color: '#A78BFA',
        fontSize: 10,
        fontWeight: '800',
    },
    reviewText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        lineHeight: 22,
        fontStyle: 'italic',
        marginBottom: 20,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    editBtn: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        height: 44,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    shareBtn: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
