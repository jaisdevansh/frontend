import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import * as Haptics from 'expo-haptics';

import { hostService } from '../../services/hostService';

export default function WaitlistManager() {
    const router = useRouter();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();

    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchWaitlist = async () => {
        try {
            const res = await hostService.getWaitlist();
            if (res.success) {
                setWaitlist(res.data);
            }
        } catch (error) {
            // Silent error
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWaitlist();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchWaitlist();
    };

    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Remove from local list instantly for smooth UI
        setWaitlist(prev => prev.filter(req => req._id !== id));
        
        if (action === 'approved') {
            showToast('Guest Approved! Notification sent.', 'success');
        } else {
            showToast('Guest removed from waitlist.', 'info');
        }

        try {
            await hostService.processWaitlist(id, action);
        } catch (error) {
            showToast('Network error, reverting', 'error');
            fetchWaitlist(); // rollback
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTextGroup}>
                    <Text style={styles.headerTitle}>Waitlist Manager</Text>
                    <Text style={styles.headerSubtitle}>Live Queue Processing</Text>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                    <FlatList
                        data={waitlist}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyWrap}>
                                <Ionicons name="checkmark-circle-outline" size={64} color="rgba(255,255,255,0.2)" />
                                <Text style={styles.emptyTxt}>Waitlist is clear!</Text>
                            </View>
                        )}
                        initialNumToRender={5}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={true}
                        renderItem={({ item: req, index }) => (
                            <View style={[styles.card, req.isPriority && styles.cardPriority]}>
                                {req.isPriority && (
                                    <View style={styles.priorityBadge}>
                                        <Ionicons name="star" size={12} color="#000" />
                                        <Text style={styles.priorityTxt}>Priority Upgrade</Text>
                                    </View>
                                )}
                                
                                <View style={styles.cardTop}>
                                    <Image source={{ uri: req.userId?.profileImage || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>{req.userId?.name || 'Guest'}</Text>
                                        <Text style={styles.metaData}>
                                            {req.partySize} Guests • Joined {new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </Text>
                                    </View>
                                    <View style={styles.queuePos}>
                                        <Text style={styles.queueNum}>#{index + 1}</Text>
                                        <Text style={styles.queueTxt}>in line</Text>
                                    </View>
                                </View>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, { backgroundColor: 'rgba(255, 69, 58, 0.1)', borderColor: '#FF453A' }]}
                                        onPress={() => handleAction(req._id, 'rejected')}
                                    >
                                        <Text style={[styles.actionBtnTxt, { color: '#FF453A' }]}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                                        onPress={() => handleAction(req._id, 'approved')}
                                    >
                                        <Text style={[styles.actionBtnTxt, { color: '#FFF' }]}>Approve Entry</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, paddingTop: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    headerTextGroup: { flex: 1 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '800' },
    headerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, fontWeight: '600' },
    
    scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100, paddingTop: 10 },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 16, fontWeight: '600' },

    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BORDER_RADIUS.xl, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
    cardPriority: { borderColor: COLORS.gold, backgroundColor: 'rgba(255, 215, 0, 0.05)' },
    
    priorityBadge: { position: 'absolute', top: -12, left: 20, backgroundColor: COLORS.gold, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
    priorityTxt: { color: '#000', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
    avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    userInfo: { flex: 1, marginLeft: 12 },
    userName: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    metaData: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
    
    queuePos: { alignItems: 'flex-end' },
    queueNum: { color: '#FFF', fontSize: 20, fontWeight: '900' },
    queueTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },

    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    actionBtnTxt: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }
});
