import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

export default function TermsScreen() {
    const goBack = useStrictBack('/');

    const sections = [
        {
            icon: "document-text-outline",
            title: "Introduction",
            content: "Welcome to Entry Club. By accessing or using our platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services."
        },
        {
            icon: "people-outline",
            title: "User Responsibilities",
            content: "You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to provide accurate, current, and complete information."
        },
        {
            icon: "alert-circle-outline",
            title: "Account Rules",
            content: "Users must be at least 18 years old to create an account. Accounts are personal and non-transferable. We reserve the right to suspend or terminate accounts that violate our community standards."
        },
        {
            icon: "card-outline",
            title: "Payment & Refund Policy",
            content: "Ticket purchases are non-refundable unless otherwise specified. We use secure third-party payment processors to handle all transactions."
        },
        {
            icon: "ban-outline",
            title: "Prohibited Activities",
            content: "You may not use the app for any illegal purpose, to harass others, or to interfere with the proper working of the platform. Scraping or automated access is strictly prohibited."
        },
        {
            icon: "diamond-outline",
            title: "Intellectual Property",
            content: "All content, designs, logos, and software used in Entry Club are the property of Entry Club Inc. or its licensors and are protected by copyright and intellectual property laws."
        },
        {
            icon: "log-out-outline",
            title: "Termination",
            content: "We reserve the right to terminate your access to the platform at any time, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users."
        },
        {
            icon: "warning-outline",
            title: "Limitation of Liability",
            content: "Entry Club is provided 'as is' without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform."
        },
        {
            icon: "sync-outline",
            title: "Changes to Terms",
            content: "We may update these terms from time to time. Your continued use of the app after such changes constitutes your acceptance of the new terms. Significant changes will be notified via email."
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backButton} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms of Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={styles.iconGlow}>
                        <Ionicons name="documents-outline" size={48} color={COLORS.primary} />
                    </View>
                    <Text style={styles.heroTitle}>Terms of Use</Text>
                    <Text style={styles.heroSubtitle}>
                        Everything you need to know about your rights and responsibilities when using Entry Club.
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
