import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

import { hostService } from '../../services/hostService';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InsightsReviews() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const goBack = useStrictBack('/(host)/dashboard');

    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        try {
            const res = await hostService.getReviews();
            if (res.success) {
                setReviews(res.data);
            }
        } catch (error) {
            // Silent error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const overallAvg = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.avgScore || 5), 0) / reviews.length).toFixed(1) : '5.0';

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTextGroup}>
                    <Text style={styles.headerTitle}>Guest Insights</Text>
                    <Text style={styles.headerSubtitle}>Venue & Event Reviews</Text>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={COLORS.gold} />
                </View>
            ) : (
                    <FlatList
                        data={reviews}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={5}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={true}
                        ListHeaderComponent={() => (
                            <View>
                                {/* Top Level Aggregate Score */}
                                <View style={styles.aggCard}>
                                    <View style={styles.scoreRow}>
                                        <Ionicons name="star" size={32} color={COLORS.gold} />
                                        <Text style={styles.mainScoreTxt}>{overallAvg}</Text>
                                    </View>
                                    <Text style={styles.aggSub}>Based on {reviews.length} authentic ratings</Text>
                                </View>
                                <Text style={styles.sectionTitle}>Recent Reviews</Text>
                            </View>
                        )}
                        renderItem={({ item: rev }) => (
                            <View style={styles.card}>
                                <View style={styles.cardHeaderRow}>
                                    {rev.userId?.profileImage ? (
                                        <Image source={{ uri: rev.userId.profileImage }} style={styles.avatar} />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Ionicons name="person" size={20} color="#7c4dff" />
                                        </View>
                                    )}
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>{rev.isAnonymous ? 'Anonymous' : (rev.userId?.name || 'Guest')}</Text>
                                        <Text style={styles.revTime}>{new Date(rev.createdAt).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={styles.scoreBadge}>
                                        <Text style={styles.scoreTxt}>{rev.avgScore?.toFixed(1) || '5.0'}</Text>
                                        <Ionicons name="star" size={12} color="#000" />
                                    </View>
                                </View>

                                <Text style={styles.revText}>{rev.feedback}</Text>

                                {rev.scores && (
                                    <View style={styles.metricsRow}>
                                        <View style={styles.metricItem}>
                                            <Text style={styles.metricLabel}>Vibe</Text>
                                            <Text style={styles.metricVal}>{rev.scores.vibe}/5</Text>
                                        </View>
                                        <View style={styles.metricItem}>
                                            <Text style={styles.metricLabel}>Service</Text>
                                            <Text style={styles.metricVal}>{rev.scores.service}/5</Text>
                                        </View>
                                        <View style={styles.metricItem}>
                                            <Text style={styles.metricLabel}>Music</Text>
                                            <Text style={styles.metricVal}>{rev.scores.music}/5</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Host Reply Action */}
                                <TouchableOpacity style={styles.replyBtn}>
                                    <Ionicons name="chatbubble-outline" size={16} color="rgba(255,255,255,0.6)" />
                                    <Text style={styles.replyTxt}>Reply to Guest</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    headerTextGroup: { flex: 1 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '800' },
    headerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, fontWeight: '600' },
    
    scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
    
    aggCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124, 77, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.2)', paddingVertical: 30, borderRadius: 24, marginBottom: 30, marginTop: 10 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mainScoreTxt: { color: '#FFF', fontSize: 40, fontWeight: '900' },
    aggSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8, fontWeight: '600', letterSpacing: 0.5 },

    sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 16 },
    
    card: { backgroundColor: '#0d0620', borderRadius: BORDER_RADIUS.xl, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(124,77,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#7c4dff' },
    userInfo: { flex: 1, marginLeft: 12 },
    userName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    revTime: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
    
    scoreBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gold, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
    scoreTxt: { color: '#000', fontSize: 14, fontWeight: '900' },

    revText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22, marginBottom: 20 },

    metricsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, marginBottom: 16 },
    metricItem: { alignItems: 'center', flex: 1 },
    metricLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    metricVal: { color: '#FFF', fontSize: 16, fontWeight: '800' },

    replyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    replyTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' }
});
