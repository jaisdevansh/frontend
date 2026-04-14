import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Easing, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useHostProfile } from '../../hooks/useHostProfile';
import { useToast } from '../../context/ToastContext';
import { getSocket } from '../../lib/socketClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');
const COLORS = {
    bg: '#000000',
    primary: '#7c4dff',
    accent: '#00e5ff',
    textMain: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.5)',
    border: 'rgba(255,255,255,0.08)',
    success: '#10B981'
};

export default function UnderReview() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { updateUser } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    // Core scanning animations
    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;

    // ⚡ Tactical Status Polling (Auto-scales based on reactivity)
    const { data: host, refetch, isRefetching } = useHostProfile();

    // 🔥 REAL-TIME STATUS UPDATE via Socket.io
    useEffect(() => {
        const socket = getSocket();
        
        if (!socket) {
            console.log('[UnderReview] ⚠️ Socket not available');
            return;
        }

        console.log('[UnderReview] 🔌 Setting up socket listener for status updates');

        const handleStatusUpdate = (data: any) => {
            console.log('[UnderReview] 🔥 SOCKET EVENT RECEIVED:', data);
            
            if (data.hostStatus === 'ACTIVE') {
                console.log('[UnderReview] ✅ APPROVED via Socket! Navigating to dashboard...');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('🎉 Approved! Welcome to Host Terminal', 'success');
                updateUser({ hostStatus: 'ACTIVE' });
                router.replace('/(host)/dashboard' as any);
            } else if (data.hostStatus === 'REJECTED') {
                console.log('[UnderReview] ❌ REJECTED via Socket!');
                showToast(data.reason || 'Verification rejected', 'error');
                updateUser({ hostStatus: 'REJECTED' });
                router.replace('/(host)/rejected' as any);
            }
        };

        socket.on('host:status:updated', handleStatusUpdate);

        return () => {
            console.log('[UnderReview] 🔌 Removing socket listener');
            socket.off('host:status:updated', handleStatusUpdate);
        };
    }, []);

    // 🔥 REAL-TIME STATUS UPDATE via Socket.io
    useEffect(() => {
        // DISABLED: Socket causing infinite reconnect loop
        // Will rely on polling only until backend JWT issue is resolved
        return () => {};
    }, []);

    useEffect(() => {
        // ⚡ Slower polling (5 seconds) - Socket is primary, this is backup
        console.log('[UnderReview] 🚀 Starting 5s backup polling...');
        const pollInt = setInterval(() => {
            console.log('[UnderReview] 📡 Backup polling... Current status:', host?.hostStatus);
            refetch();
        }, 5000); // 5 seconds instead of 500ms
        
        const createLoop = (anim: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    })
                ])
            ).start();
        };

        createLoop(pulse1, 0);
        createLoop(pulse2, 1000);

        return () => {
            console.log('[UnderReview] 🛑 Stopping polling');
            clearInterval(pollInt);
        };
    }, []); // Empty deps - only run once on mount

    // 🚀 Auto-Transition Logic (Instant reaction to status changes)
    useEffect(() => {
        console.log('[UnderReview] 🔍 Status check useEffect triggered');
        console.log('[UnderReview] 📊 host object:', host);
        console.log('[UnderReview] 📌 host?.hostStatus:', host?.hostStatus);
        
        if (!host?.hostStatus) {
            console.log('[UnderReview] ⚠️ No host status available yet');
            return;
        }
        
        console.log('[UnderReview] ✅ Status available:', host.hostStatus);
        
        if (host.hostStatus === 'ACTIVE') {
            console.log('[UnderReview] 🎉 STATUS IS ACTIVE! Navigating to dashboard...');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('🎉 Approved! Welcome to Host Terminal', 'success');
            updateUser({ hostStatus: 'ACTIVE' });
            router.replace('/(host)/dashboard' as any);
        } else if (host.hostStatus === 'REJECTED') {
            console.log('[UnderReview] ❌ STATUS IS REJECTED! Navigating to rejected...');
            updateUser({ hostStatus: 'REJECTED' });
            router.replace('/(host)/rejected' as any);
        } else {
            console.log('[UnderReview] ⏳ Status still pending:', host.hostStatus);
        }
    }, [host?.hostStatus]); // Only trigger when status changes

    const handleRecheck = useCallback(async () => {
        console.log('[UnderReview] 🔄 Manual recheck triggered');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const result = await refetch();
        
        console.log('[UnderReview] 📥 Refetch result:', result.data);
        
        // Check the refetched status
        const newStatus = result.data?.hostStatus;
        console.log('[UnderReview] 🎯 New status from refetch:', newStatus);
        
        if (newStatus === 'ACTIVE') {
            console.log('[UnderReview] ✅ APPROVED! Navigating to dashboard...');
            // ⚡ INSTANT redirect
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('🎉 Verification Approved! Welcome to Host Terminal', 'success');
            updateUser({ hostStatus: 'ACTIVE' });
            router.replace('/(host)/dashboard' as any);
        } else if (newStatus === 'REJECTED') {
            console.log('[UnderReview] ❌ REJECTED! Navigating to rejected...');
            // ⚡ INSTANT redirect
            showToast('Verification rejected. Please check details.', 'error');
            updateUser({ hostStatus: 'REJECTED' });
            router.replace('/(host)/rejected' as any);
        } else {
            console.log('[UnderReview] ⏳ Still pending. Status:', newStatus);
            // Still pending
            showToast('⏳ Your verification is still under review. Our team is working on it!', 'info');
        }
    }, [refetch, showToast, updateUser, router]);

    const getPulseStyle = (anim: Animated.Value) => ({
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2] }) }],
        opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.5, 0] })
    });

    const isPending = !host || host.hostStatus === 'PENDING_VERIFICATION' || host.hostStatus === 'CREATED';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LinearGradient colors={['#02000A', '#060017', '#000000']} style={StyleSheet.absoluteFill} />

            <View style={styles.topGlow} />

            <View style={styles.safeArea}>
                <View style={[styles.header, { marginTop: insets.top + 20 }]}>
                    <View style={styles.statusPill}>
                         <View style={styles.pulsingDot} />
                         <Text style={styles.statusTxt}>IDENTITY AUDIT ACTIVE</Text>
                    </View>
                </View>

                <View style={styles.centerBox}>
                    <View style={styles.animationContainer}>
                        <Animated.View style={[styles.ripple, getPulseStyle(pulse1)]} />
                        <Animated.View style={[styles.ripple, getPulseStyle(pulse2)]} />
                        
                        <LinearGradient colors={['rgba(124, 77, 255, 0.15)', 'rgba(0, 229, 255, 0.05)']} style={styles.coreOrb}>
                            <MaterialCommunityIcons name="shield-lock-outline" size={48} color={COLORS.primary} />
                        </LinearGradient>
                    </View>

                    <Text style={styles.title}>Under Review</Text>
                    <Text style={styles.message}>
                        Our compliance matrix is securely auditing your documents. Access to the Host Command Center will unlock automatically upon verification.
                    </Text>

                    <View style={styles.trackerContainer}>
                        {/* Stage 1: Uploads */}
                        <View style={styles.trackerRow}>
                            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                            <Text style={styles.trackerTextPassed}>Identity Documents Secured</Text>
                        </View>
                        
                        <View style={styles.trackerLine} />

                        {/* Stage 2: Verification */}
                        <View style={styles.trackerRow}>
                            {isPending ? (
                                <ActivityIndicator size="small" color={COLORS.accent} style={{ marginRight: 6 }} />
                            ) : (
                                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                            )}
                            <Text style={isPending ? styles.trackerTextActive : styles.trackerTextPassed}>
                                Security Clearance
                            </Text>
                        </View>
                        
                        <View style={[styles.trackerLine, !isPending && { backgroundColor: COLORS.success }]} />

                        {/* Stage 3: Live */}
                        <View style={styles.trackerRow}>
                            <Ionicons 
                                name={(host?.hostStatus === 'ACTIVE') ? "checkmark-circle" : "ellipse-outline"} 
                                size={24} 
                                color={(host?.hostStatus === 'ACTIVE') ? COLORS.success : COLORS.textMuted} 
                            />
                            <Text 
                                style={(host?.hostStatus === 'ACTIVE') ? styles.trackerTextPassed : styles.trackerTextMuted}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                                Host Terminal Live
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.etaBox}>
                        <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                        <Text style={styles.etaText}>Priority Audit: <Text style={{ color: COLORS.textMain, fontWeight: '700' }}>Active</Text></Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.actionBtn}
                        activeOpacity={0.8}
                        onPress={handleRecheck}
                        disabled={isRefetching}
                    >
                        <LinearGradient colors={[COLORS.primary, '#5a2fc7']} style={styles.btnGradient} start={{x:0,y:0}} end={{x:1,y:0}}>
                            {isRefetching ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="refresh" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.btnText}>Recheck Status</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    topGlow: { position: 'absolute', top: -100, width: width, height: 400, backgroundColor: 'rgba(124, 77, 255, 0.08)', borderRadius: 200, opacity: 0.8 },
    safeArea: { flex: 1, zIndex: 1 },
    header: { alignItems: 'center', marginBottom: 20 },
    statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
    statusTxt: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 30 },
    animationContainer: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    ripple: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: 'transparent' },
    coreOrb: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.3)', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20 },
    title: { color: COLORS.textMain, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginBottom: 10 },
    message: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10, marginBottom: 30 },
    trackerContainer: { 
        width: '100%', 
        backgroundColor: 'rgba(20, 20, 30, 0.8)', 
        padding: 20, 
        borderRadius: 20, 
        borderWidth: 1.5, 
        borderColor: 'rgba(124, 77, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    trackerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    trackerTextPassed: { color: COLORS.textMain, fontSize: 15, fontWeight: '700', marginLeft: 12, flex: 1 },
    trackerTextActive: { color: COLORS.accent, fontSize: 15, fontWeight: '800', marginLeft: 10, flex: 1 },
    trackerTextMuted: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', marginLeft: 12, flex: 1 },
    trackerLine: { height: 28, width: 3, backgroundColor: COLORS.success, marginLeft: 10, marginVertical: 2, opacity: 0.8, borderRadius: 2 },
    footer: { paddingHorizontal: 24, paddingTop: 16 },
    etaBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14, gap: 6 },
    etaText: { color: COLORS.textMuted, fontSize: 12 },
    actionBtn: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    btnGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    btnText: { color: COLORS.textMain, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }
});
