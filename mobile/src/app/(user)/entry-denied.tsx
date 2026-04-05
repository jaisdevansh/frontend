import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

export default function EntryDeniedScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.push('/')} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Access Status</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.heroSection}>
                    <View style={styles.iconGlow}>
                        <Ionicons name="hand-left" size={60} color="#FF3B30" />
                    </View>
                    <Text style={styles.heroTitle}>Entry Denied</Text>
                    <Text style={styles.heroSubtitle}>
                        Your ticket was rejected at the venue entrance. Access to this event has been restricted.
                    </Text>
                </View>

                {/* Booking that was denied */}
                <Text style={styles.sectionLabel}>AFFECTED BOOKING</Text>
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
                </View>

                {/* Reasons / FAQ */}
                <Text style={styles.sectionLabel}>WHY DID THIS HAPPEN?</Text>
                <View style={[styles.summaryCard, { gap: 16 }]}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                            <Ionicons name="shirt-outline" size={18} color="#FF3B30" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailTitle}>Dress Code Violation</Text>
                            <Text style={styles.detailDesc}>The venue reserves the right to deny entry if dress policies are not met.</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                            <Ionicons name="people-circle-outline" size={18} color="#FF3B30" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailTitle}>Intoxication or Conduct</Text>
                            <Text style={styles.detailDesc}>Security can refuse entry to heavily intoxicated individuals for safety reasons.</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                            <Ionicons name="alert-circle-outline" size={18} color="#FF3B30" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailTitle}>Invalid Ticket</Text>
                            <Text style={styles.detailDesc}>The QR code presented may have been scanned previously or deemed invalid.</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.followupBox}>
                    <Text style={styles.followupTitle}>Need clarification?</Text>
                    <Text style={styles.followupText}>
                        If you believe this was an error, please reach out to support. Note that venue decisions at the door are final and non-refundable.
                    </Text>
                </View>

            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom || 24 }]}>
                <TouchableOpacity 
                    style={styles.contactBtn} 
                    activeOpacity={0.9}
                    onPress={() => router.push('/(settings)/support-chat' as any)}
                >
                    <Text style={styles.contactBtnText}>Contact Support</Text>
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
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
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
        width: 56,
        height: 56,
        borderRadius: 14,
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
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    detailIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailTextContainer: {
        flex: 1,
    },
    detailTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    detailDesc: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    followupBox: {
        backgroundColor: 'rgba(124, 77, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.15)',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: 20,
    },
    followupTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    followupText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
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
    },
    contactBtn: {
        height: 56,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    }
});
