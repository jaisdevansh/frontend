import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

interface FAQItemProps {
    question: string;
    answer: string;
    isOpen: boolean;
    onPress: () => void;
}

const FAQItem = ({ question, answer, isOpen, onPress }: FAQItemProps) => {
    return (
        <TouchableOpacity
            style={[styles.faqCard, isOpen && styles.faqCardOpen]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{question}</Text>
                <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={isOpen ? COLORS.primary : "rgba(255,255,255,0.4)"}
                />
            </View>
            {isOpen && (
                <View style={styles.faqContent}>
                    <Text style={styles.faqAnswer}>{answer}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function HelpCenterScreen() {
    const router = useRouter();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    // Bypass buggy Expo Router back behavior which defaults to home tab
    const handleBack = useCallback(() => {
        router.navigate('/(settings)/terms-support');
        return true; 
    }, [router]);

    React.useEffect(() => {
        const { BackHandler } = require('react-native');
        const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
        return () => sub.remove();
    }, [handleBack]);

    const faqs = useMemo(() => [
        {
            question: "How do I use my booking QR pass?",
            answer: "Once your booking is confirmed, you'll see it under 'My Bookings'. Tap the pass to reveal your secure QR code and present it to the bouncer at the venue entrance. It updates securely in real-time."
        },
        {
            question: "How do I update my profile?",
            answer: "Tap on your profile tab at the bottom, then click 'Edit Profile'. You can update your display name, gender, and date of birth there."
        },
        {
            question: "How do I earn and use Loyalty Points?",
            answer: "You earn points for every completed booking and for referring friends! Redeem these points in the 'My Rewards & Coupons' section to unlock exclusive discount codes."
        },
        {
            question: "What do I need to bring to the venue?",
            answer: "You strictly need your Entry Club QR Pass and a valid, physical Government-issued ID. Venues reserve the right to deny entry if you fail to bring valid identification."
        }
    ], []);

    const toggleFAQ = useCallback((index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenIndex(openIndex === index ? null : index);
    }, [openIndex]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help Center</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

                <View style={styles.faqList}>
                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === index}
                            onPress={() => toggleFAQ(index)}
                        />
                    ))}
                </View>

                <View style={styles.supportSection}>
                    <Text style={styles.sectionTitle}>Need more help?</Text>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/support-chat')}
                    >
                        <View style={styles.iconBox}>
                            <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Chat with support AI</Text>
                            <Text style={styles.actionSubtitle}>Available 24/7 for instant help</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(settings)/support-email')}
                    >
                        <View style={styles.iconBox}>
                            <Ionicons name="mail" size={24} color="#4ade80" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Email Support</Text>
                            <Text style={styles.actionSubtitle}>Get a reply within 12 hours</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(user)/report-incident')}
                    >
                        <View style={styles.iconBox}>
                            <Ionicons name="shield-outline" size={22} color="#f87171" />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Report an Incident</Text>
                            <Text style={styles.actionSubtitle}>Safety, harassment or venue issues</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(settings)/report-bug')}
                    >
                        <View style={styles.iconBox}>
                            <Ionicons name="bug" size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Report a Bug</Text>
                            <Text style={styles.actionSubtitle}>With screenshots & diagnostic data</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>

                    <View style={styles.techSupportBox}>
                        <Ionicons name="code-working" size={18} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.techSupportText}>
                            For critical technical bugs, contact our lead developer at: 
                            <Text style={styles.techEmail}> devanshjais20@gmail.com</Text>
                        </Text>
                    </View>
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
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: SPACING.xl,
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: SPACING.lg,
    },
    faqList: {
        gap: 12,
        marginBottom: SPACING.xxl,
    },
    faqCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    faqCardOpen: {
        borderColor: 'rgba(124, 77, 255, 0.3)',
        backgroundColor: 'rgba(124, 77, 255, 0.02)',
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
    },
    faqQuestion: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        marginRight: 10,
    },
    faqContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.lg,
    },
    faqAnswer: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
        lineHeight: 22,
    },
    supportSection: {
        marginTop: SPACING.sm,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionInfo: {
        flex: 1,
    },
    actionTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    actionSubtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    footerSpacing: {
        height: 40,
    },
    techSupportBox: {
        marginTop: 24,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    techSupportText: {
        flex: 1,
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        lineHeight: 18,
    },
    techEmail: {
        color: COLORS.primary,
        fontWeight: '700',
    }
});
