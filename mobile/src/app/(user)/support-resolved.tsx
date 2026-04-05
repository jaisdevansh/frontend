import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

export default function SupportResolvedScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const CASE_ID = "CS-892410";

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Case Status</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.heroSection}>
                    <View style={styles.iconGlow}>
                        <Ionicons name="checkmark-done-circle" size={60} color="#34C759" />
                    </View>
                    <Text style={styles.heroTitle}>Case Resolved</Text>
                    <Text style={styles.heroSubtitle}>
                        Your incident report has been successfully reviewed and resolved by our Trust & Safety team.
                    </Text>
                    
                    <View style={styles.caseBadge}>
                        <Text style={styles.caseBadgeText}>Case ID: {CASE_ID}</Text>
                    </View>
                </View>

                {/* Resolution Details */}
                <Text style={styles.sectionLabel}>RESOLUTION OVERVIEW</Text>
                <View style={styles.summaryCard}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                            <Ionicons name="shield-checkmark" size={18} color="#34C759" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailTitle}>Action Taken</Text>
                            <Text style={styles.detailDesc}>Appropriate warnings and strict safety measures have been enforced regarding the reported user.</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                        <View style={[styles.detailIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                            <Ionicons name="calendar-outline" size={18} color="rgba(255,255,255,0.7)" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailTitle}>Date Resolved</Text>
                            <Text style={styles.detailDesc}>October 24, 2026 at 4:30 PM (IST)</Text>
                        </View>
                    </View>
                </View>

                {/* Feedback Followup */}
                <View style={styles.followupBox}>
                    <Text style={styles.followupTitle}>Need further assistance?</Text>
                    <Text style={styles.followupText}>
                        If you believe this wasn't fully resolved or you have additional evidence, you can reopen this ticket within 48 hours.
                    </Text>
                    
                    <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.7}>
                        <Text style={styles.outlineBtnText}>Reopen Ticket</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom || 24 }]}>
                <TouchableOpacity 
                    style={styles.doneBtn} 
                    activeOpacity={0.9}
                    onPress={() => router.push('/')}
                >
                    <Text style={styles.doneBtnText}>Return to Home</Text>
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
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.3)',
        shadowColor: '#34C759',
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
        marginBottom: 16,
    },
    caseBadge: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    caseBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
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
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    detailIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
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
        marginVertical: SPACING.lg,
    },
    followupBox: {
        backgroundColor: 'rgba(124, 77, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.15)',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        alignItems: 'center',
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
        marginBottom: 16,
    },
    outlineBtn: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 100,
    },
    outlineBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
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
    doneBtn: {
        height: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneBtnText: {
        color: '#030303',
        fontSize: 16,
        fontWeight: '800',
    }
});
