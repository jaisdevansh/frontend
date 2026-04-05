import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';

export default function WaitlistUpgradeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const [upgrading, setUpgrading] = useState(false);

    const handleUpgrade = () => {
        setUpgrading(true);
        setTimeout(() => {
            setUpgrading(false);
            showToast('Priority Upgraded Successfully!', 'success');
            router.back();
        }, 2000);
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Upgrade Priority</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.heroSection}>
                    <View style={styles.iconGlow}>
                        <Ionicons name="flash" size={60} color={COLORS.gold} />
                    </View>
                    <Text style={styles.heroTitle}>Skip the Queue</Text>
                    <Text style={styles.heroSubtitle}>
                        Tired of waiting? Upgrade to Priority Waitlist and jump ahead of the line to secure your spot faster.
                    </Text>
                </View>

                {/* Queue Jump Stats */}
                <View style={styles.statsCard}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>CURRENT</Text>
                        <Text style={styles.statValue}>#12</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.3)" />
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>PRIORITY</Text>
                        <Text style={[styles.statValue, { color: COLORS.gold }]}>#1</Text>
                    </View>
                </View>

                {/* Perks List */}
                <Text style={styles.sectionLabel}>PRIORITY PERKS</Text>
                <View style={styles.perksCard}>
                    <View style={styles.perkRow}>
                        <View style={styles.perkIconBox}>
                            <Ionicons name="speedometer-outline" size={20} color={COLORS.gold} />
                        </View>
                        <View style={styles.perkTextContainer}>
                            <Text style={styles.perkTitle}>Instant Decision</Text>
                            <Text style={styles.perkDesc}>Get your booking confirmed or rejected within 15 minutes.</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.perkRow}>
                        <View style={styles.perkIconBox}>
                            <Ionicons name="star-outline" size={20} color={COLORS.gold} />
                        </View>
                        <View style={styles.perkTextContainer}>
                            <Text style={styles.perkTitle}>VIP Entry Line</Text>
                            <Text style={styles.perkDesc}>Skip the general admission queue at the door if approved.</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.perkRow}>
                        <View style={styles.perkIconBox}>
                            <Ionicons name="cash-outline" size={20} color={COLORS.gold} />
                        </View>
                        <View style={styles.perkTextContainer}>
                            <Text style={styles.perkTitle}>Risk-Free Payment</Text>
                            <Text style={styles.perkDesc}>The upgrade fee is fully refunded if you do not get a table.</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom || 24 }]}>
                <View style={styles.footerPricing}>
                    <Text style={styles.priceLabel}>Priority Upgrade Fee</Text>
                    <Text style={styles.priceValue}>₹1,500 <Text style={styles.priceUnit}>/ booking</Text></Text>
                </View>
                
                <TouchableOpacity 
                    style={styles.upgradeBtn} 
                    activeOpacity={0.9}
                    disabled={upgrading}
                    onPress={handleUpgrade}
                >
                    {upgrading ? (
                        <ActivityIndicator color="#030303" />
                    ) : (
                        <>
                            <Text style={styles.upgradeBtnText}>Pay to Upgrade</Text>
                            <Ionicons name="flash" size={18} color="#030303" />
                        </>
                    )}
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
        paddingBottom: 160,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
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
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 8,
    },
    heroSubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: SPACING.md,
    },
    statsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.xxl,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 4,
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '900',
    },
    sectionLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 12,
        marginLeft: 4,
    },
    perksCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    perkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    perkIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    perkTextContainer: {
        flex: 1,
    },
    perkTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    perkDesc: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: SPACING.lg,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(11, 15, 26, 0.95)',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 16,
    },
    footerPricing: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontWeight: '500',
    },
    priceValue: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
    },
    priceUnit: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        fontWeight: '500',
    },
    upgradeBtn: {
        height: 56,
        backgroundColor: COLORS.gold,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 6,
        gap: 8,
    },
    upgradeBtnText: {
        color: '#030303',
        fontSize: 16,
        fontWeight: '800',
    }
});
