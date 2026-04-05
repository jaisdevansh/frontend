import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

export default function WaitlistStatusScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [canceling, setCanceling] = useState(false);

    const handleCancel = () => {
        setCanceling(true);
        setTimeout(() => {
            setCanceling(false);
            router.push('/');
        }, 1500);
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.push('/')} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Waitlist Status</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.heroSection}>
                    <View style={styles.iconGlow}>
                        <Ionicons name="hourglass-outline" size={54} color={COLORS.gold} />
                    </View>
                    <Text style={styles.heroTitle}>You're on the Waitlist!</Text>
                    <Text style={styles.heroSubtitle}>
                        Your request is currently queued. We will notify you immediately if a spot becomes available.
                    </Text>
                    
                    <View style={styles.queueBox}>
                        <Text style={styles.queueLabel}>CURRENT POSITION</Text>
                        <Text style={styles.queueValue}>#12</Text>
                        <Text style={styles.queueTotal}>of 45 waiting</Text>
                    </View>
                </View>

                {/* Requested Booking Details */}
                <Text style={styles.sectionLabel}>YOUR REQUEST</Text>
                <View style={styles.summaryCard}>
                    <View style={styles.venueInfo}>
                        <Image
                            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCC3ERARp9Uh7j45fDYqqQa5xWkJ68Rn4OTvvnWPmz_0HxpEPVoWJp_I0IBc3rKz3t9B_rZuxxFwe_n4k9S9K6tt1CxisRm5DZD-xScpcqrWVg8dbIsuVO7hqxL4rf_Sfce_Kb2hGgDkOYUInoH4bRTHhQg2hcj70PbsNGY4-X4faiEES2Ea2_6kCWG9dWGcnL51MXEX1iAMI_LZZS1APqrfhFAIDINAXpcW7BlSTiky1Mq7TTRLo1RGg8mtrTjjLBKveu9vRB0xVOA' }}
                            style={styles.venueImage}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.venueTitle}>VIP Booth V4 • Elite Lounge</Text>
                            <Text style={styles.venueMeta}>Sat, 24 Oct • 10:30 PM (4 Guests)</Text>
                        </View>
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Estimated Pre-Auth</Text>
                        <Text style={styles.detailValue}>₹25,000</Text>
                    </View>
                </View>

                {/* How it works info */}
                <View style={[styles.summaryCard, { gap: 16 }]}>
                    <View style={styles.infoRow}>
                        <Ionicons name="notifications-outline" size={20} color={COLORS.gold} />
                        <Text style={styles.infoText}>You will receive a push notification if your booking is confirmed.</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="card-outline" size={20} color={COLORS.gold} />
                        <Text style={styles.infoText}>Your card won't be charged unless your spot is successfully secured.</Text>
                    </View>
                </View>

            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom || 24 }]}>
                <TouchableOpacity 
                    style={styles.cancelBtn} 
                    activeOpacity={0.8}
                    disabled={canceling}
                    onPress={handleCancel}
                >
                    {canceling ? (
                        <ActivityIndicator color="#FF3B30" />
                    ) : (
                        <Text style={styles.cancelBtnText}>Leave</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.upgradeBtn} 
                    activeOpacity={0.9}
                    onPress={() => router.push('/(user)/waitlist-upgrade' as any)}
                >
                    <Text style={styles.upgradeBtnText}>Skip the Queue</Text>
                    <Ionicons name="flash" size={16} color="#030303" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: SPACING.xl,
        paddingTop: 40,
        paddingBottom: 120,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    iconGlow: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '900',
        marginBottom: 8,
    },
    heroSubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: SPACING.lg,
        marginBottom: 24,
    },
    queueBox: {
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
        paddingHorizontal: 40,
        paddingVertical: 20,
        borderRadius: BORDER_RADIUS.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    queueLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 4,
    },
    queueValue: {
        color: COLORS.gold,
        fontSize: 48,
        fontWeight: '900',
        letterSpacing: -2,
    },
    queueTotal: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 4,
    },
    sectionLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 12,
        marginLeft: 4,
    },
    summaryCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: SPACING.xl,
    },
    venueInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    venueImage: {
        width: 50,
        height: 50,
        borderRadius: 12,
    },
    venueTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    venueMeta: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 13,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: SPACING.lg,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
    detailValue: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255, 215, 0, 0.03)',
        padding: 12,
        borderRadius: BORDER_RADIUS.default,
        gap: 12,
    },
    infoText: {
        flex: 1,
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(11, 15, 26, 0.95)',
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 16,
    },
    cancelBtn: {
        flex: 1,
        height: 56,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '700',
    },
    upgradeBtn: {
        flex: 2,
        height: 56,
        backgroundColor: COLORS.gold,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        gap: 8,
    },
    upgradeBtnText: {
        color: '#030303',
        fontSize: 16,
        fontWeight: '800',
    }
});
