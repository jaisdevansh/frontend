import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
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
    const goBack = useStrictBack('/');
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = useMemo(() => [
        {
            question: "How do I reset my password?",
            answer: "Go to the Login screen and tap 'Forgot Password?'. Enter your email and we'll send you a link to reset your password. You can also change it from the Profile settings when logged in."
        },
        {
            question: "How do I update profile?",
            answer: "Tap on your profile icon at the bottom of the home screen, then click the 'Edit Profile' button. You can update your bio, profile picture, and display name there."
        },
        {
            question: "How do I cancel subscription?",
            answer: "Go to Settings > Subscription. You'll see your current plan and an option to 'Manage Subscription' where you can cancel or downgrade your tier. Benefits will continue until the end of the billing cycle."
        },
        {
            question: "How do I contact support?",
            answer: "You can use our 'Party Support AI' chat for instant help, or send an email to support@partyapp.com. Our concierge team is available 24/7 for Black tier members."
        }
    ], []);

    const toggleFAQ = useCallback((index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenIndex(openIndex === index ? null : index);
    }, [openIndex]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backButton}>
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
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        lineHeight: 20,
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
