import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

export default function PrivacyScreen() {
    const goBack = useStrictBack('/');

    const sections = [
        {
            icon: "shield-checkmark-outline",
            title: "Data We Collect",
            content: "We collect personal information that you provide to us, such as your name, email address, phone number, and profile picture. We also collect usage data, including device information, IP address, and app interaction logs."
        },
        {
            icon: "analytics-outline",
            title: "How We Use Data",
            content: "Your data is used to provide and maintain our services, personalize your experience, process payments, and communicate with you about updates or marketing offers (which you can opt out of)."
        },
        {
            icon: "share-social-outline",
            title: "Data Sharing Policy",
            content: "We do not sell your personal data to third parties. We may share data with service providers who assist us in operations, or when required by law to comply with legal processes."
        },
        {
            icon: "lock-closed-outline",
            title: "Data Security Measures",
            content: "We implement industry-standard security measures to protect your data from unauthorized access, loss, or misuse. This includes encryption (SSL/TLS) and secure database protocols."
        },
        {
            icon: "person-outline",
            title: "User Rights",
            content: "You have the right to access, correct, or delete your personal data. You can manage your preferences within the app settings or by contacting our support team."
        },
        {
            icon: "flash-outline",
            title: "Cookies & Tracking",
            content: "We use cookies and similar tracking technologies to track activity on our platform and hold certain information to improve app performance and user experience."
        },
        {
            icon: "trash-outline",
            title: "Account Deletion Policy",
            content: "You can request the deletion of your account at any time. Upon request, we will remove your personal identifying information from our active databases within 30 days."
        },
        {
            icon: "mail-outline",
            title: "Contact Information",
            content: "If you have any questions about this Privacy Policy, please contact us at privacy@entryclub.com or via the Support Chat in the app."
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backButton} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={styles.iconGlow}>
                        <Ionicons name="shield-half-outline" size={48} color={COLORS.primary} />
                    </View>
                    <Text style={styles.heroTitle}>Your Privacy Matters</Text>
                    <Text style={styles.heroSubtitle}>
                        We are committed to protecting your personal information and your right to privacy.
                    </Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Last Updated: Feb 2026</Text>
                    </View>
                </View>

                <View style={styles.sectionsContainer}>
                    {sections.map((section, index) => (
                        <View key={index} style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIcon}>
                                    <Ionicons name={section.icon as any} size={20} color={COLORS.primary} />
                                </View>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                            </View>
                            <Text style={styles.sectionText}>{section.content}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.footerSpacing} />
            </ScrollView>
        </SafeAreaView>
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
        paddingHorizontal: SPACING.lg,
        paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backgroundColor: COLORS.background.dark,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        paddingTop: SPACING.xl,
        paddingBottom: 40,
    },
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xxl,
    },
    iconGlow: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(124, 77, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.2)',
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    badgeText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    sectionsContainer: {
        paddingHorizontal: SPACING.xl,
        gap: 16,
    },
    sectionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(124, 77, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },
    sectionText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        lineHeight: 22,
    },
    footerSpacing: {
        height: 40,
    }
});
