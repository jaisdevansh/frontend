import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Easing, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useHostProfile } from '../../hooks/useHostProfile';

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
    
    // Core scanning animations
    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;

    // ⚡ Tactical Status Polling (Auto-scales based on reactivity)
    const { data: host, refetch } = useHostProfile();

    useEffect(() => {
        // Poll every 10s for status updates
        const pollInt = setInterval(() => refetch(), 10000);
        
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

        return () => clearInterval(pollInt);
    }, [refetch]);

    // 🚀 Auto-Transition Logic (Sub-ms reaction to status changes)
    useEffect(() => {
        if (host?.hostStatus === 'ACTIVE') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // UPDATE GLOBAL STATE TO PREVENT REDO LOOPS
            updateUser({ hostStatus: 'ACTIVE' });
            router.replace('/(host)/dashboard' as any);
        } else if (host?.hostStatus === 'REJECTED') {
             router.replace('/(host)/rejected' as any);
        }
    }, [host?.hostStatus, updateUser]);

    const handleReturn = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace('/(user)/home' as any);
    }, [router]);

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
                            <MaterialCommunityIcons name="shield-lock-outline" size={54} color={COLORS.primary} />
                        </LinearGradient>
                    </View>

                    <Text style={styles.title}>Under Review</Text>
                    <Text style={styles.message}>
                        Our compliance matrix is securely auditing your documents. Access to the Host Command Center will unlock automatically upon verification.
                    </Text>

                    <View style={styles.trackerContainer}>
                        {/* Stage 1: Uploads */}
                        <View style={styles.trackerRow}>
                            <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                            <Text style={styles.trackerTextPassed}>Identity Documents Secured</Text>
                        </View>
                        
                        <View style={styles.trackerLine} />

                        {/* Stage 2: Verification */}
                        <View style={styles.trackerRow}>
                            {isPending ? (
                                <ActivityIndicator size="small" color={COLORS.accent} style={{ marginRight: 6 }} />
                            ) : (
                                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
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
                                size={22} 
                                color={(host?.hostStatus === 'ACTIVE') ? COLORS.success : COLORS.textMuted} 
                            />
                            <Text style={(host?.hostStatus === 'ACTIVE') ? styles.trackerTextPassed : styles.trackerTextMuted}>
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
                        onPress={handleReturn}
                    >
                        <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.btnGradient} start={{x:0,y:0}} end={{x:0,y:1}}>
                            <Text style={styles.btnText}>Return to Consumer Feed</Text>
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
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    animationContainer: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    ripple: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: 'transparent' },
    coreOrb: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124, 77, 255, 0.3)', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20 },
    title: { color: COLORS.textMain, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 12 },
    message: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 40 },
    trackerContainer: { width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border },
    trackerRow: { flexDirection: 'row', alignItems: 'center' },
    trackerTextPassed: { color: COLORS.textMain, fontSize: 15, fontWeight: '700', marginLeft: 12 },
    trackerTextActive: { color: COLORS.accent, fontSize: 15, fontWeight: '800', marginLeft: 8 },
    trackerTextMuted: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', marginLeft: 12 },
    trackerLine: { height: 24, width: 2, backgroundColor: COLORS.primary, marginLeft: 10, opacity: 0.4 },
    footer: { paddingHorizontal: 24 },
    etaBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 6 },
    etaText: { color: COLORS.textMuted, fontSize: 13 },
    actionBtn: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    btnGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: COLORS.textMain, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }
});
