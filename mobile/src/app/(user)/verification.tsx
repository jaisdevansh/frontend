import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { LinearGradient } from 'expo-linear-gradient';

export default function Verification() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [selectedDoc, setSelectedDoc] = useState<'aadhar' | 'passport' | null>('aadhar');

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Background Orbs */}
            <View style={styles.orb1} />
            <View style={styles.orb2} />

            {/* Header / Progress */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>STEP 1 OF 3</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Verification Progress</Text>
                        <Text style={styles.progressValue}>33%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '33%' }]} />
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Headline */}
                <View style={styles.headlineSection}>
                    <Text style={styles.headline}>
                        Verify Your <Text style={{ color: '#7C4DFF' }}>Identity</Text>
                    </Text>
                    <Text style={styles.subheadline}>
                        To maintain the exclusivity of our community, please select a document to confirm your profile.
                    </Text>
                </View>

                {/* Doc Options */}
                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        style={[styles.glassCard, selectedDoc === 'aadhar' && styles.cardActive]}
                        onPress={() => setSelectedDoc('aadhar')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.cardIconBox}>
                            <MaterialCommunityIcons name="badge-account-outline" size={24} color="#7C4DFF" />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Aadhar / National ID</Text>
                            <Text style={styles.cardDesc}>Recommended for local residents. Instant verification.</Text>
                        </View>
                        <View style={[styles.radio, selectedDoc === 'aadhar' && styles.radioActive]}>
                            {selectedDoc === 'aadhar' && <View style={styles.radioInner} />}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.glassCard, selectedDoc === 'passport' && styles.cardActive]}
                        onPress={() => setSelectedDoc('passport')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(77, 124, 255, 0.2)' }]}>
                            <MaterialCommunityIcons name="book-open-page-variant-outline" size={24} color="#4d7cff" />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Passport</Text>
                            <Text style={styles.cardDesc}>Best for international guests. Secure global standard.</Text>
                        </View>
                        <View style={[styles.radio, selectedDoc === 'passport' && styles.radioActive]}>
                            {selectedDoc === 'passport' && <View style={styles.radioInner} />}
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Security Badge */}
                <View style={styles.securityWrapper}>
                    <View style={styles.securityBadge}>
                        <Ionicons name="shield-checkmark" size={16} color="#4ade80" />
                        <Text style={styles.securityText}>ENCRYPTED & SECURE</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.privacyNote}>
                    <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.privacyText}>
                        Your data is end-to-end encrypted. We do not store your private document details on our servers once verified.
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.continueBtn}
                    activeOpacity={0.9}
                    onPress={() => router.replace('/(user)/home')}
                >
                    <Text style={styles.continueText}>Continue</Text>
                    <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
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
    orb1: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(124, 77, 255, 0.1)',
        opacity: 0.5,
    },
    orb2: {
        position: 'absolute',
        top: '40%',
        left: -150,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: 'rgba(77, 124, 255, 0.05)',
        opacity: 0.5,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBadge: {
        backgroundColor: 'rgba(124, 77, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.2)',
    },
    stepBadgeText: {
        color: '#7C4DFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
    },
    progressContainer: {
        gap: 8,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    progressLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    progressValue: {
        color: '#7C4DFF',
        fontSize: 11,
        fontWeight: '800',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#7C4DFF',
        borderRadius: 3,
        shadowColor: '#7C4DFF',
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 200,
    },
    headlineSection: {
        marginTop: 32,
    },
    headline: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
    },
    subheadline: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
        lineHeight: 24,
        marginTop: 12,
    },
    optionsContainer: {
        marginTop: 40,
        gap: 16,
    },
    glassCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(23, 31, 54, 0.4)',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.1)',
    },
    cardActive: {
        borderColor: '#7C4DFF',
        backgroundColor: 'rgba(124, 77, 255, 0.08)',
    },
    cardIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(124, 77, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    cardDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    radioActive: {
        borderColor: '#7C4DFF',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#7C4DFF',
    },
    securityWrapper: {
        alignItems: 'center',
        marginTop: 32,
    },
    securityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    securityText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(11, 15, 26, 0.9)',
        padding: 24,
    },
    privacyNote: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
        opacity: 0.6,
    },
    privacyText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 11,
        lineHeight: 16,
    },
    continueBtn: {
        height: 56,
        backgroundColor: '#4d7cff',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#4d7cff',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    continueText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
