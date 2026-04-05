import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useToast } from '../../context/ToastContext';
import { hostService } from '../../services/hostService';

export default function SupportDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const goBack = useStrictBack('/(host)/profile');
    const { showToast } = useToast();

    const [showTicketModal, setShowTicketModal] = useState(false);
    const [ticket, setTicket] = useState({ subject: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleRaiseTicket = async () => {
        if (!ticket.subject || !ticket.description) {
            showToast('Please fill all fields', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const res = await hostService.raiseTicket(ticket);
            if (res.success) {
                showToast('Support ticket raised successfully', 'success');
                setShowTicketModal(false);
                setTicket({ subject: '', description: '' });
            }
        } catch (error) {
            showToast('Failed to raise ticket', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Support Dashboard</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, styles.aiCard]}>
                    <View style={styles.aiIconBox}>
                        <Ionicons name="headset-outline" size={32} color="white" />
                    </View>
                    <Text style={styles.aiTitle}>Chat With Admin Support</Text>
                    <Text style={styles.aiDescription}>Direct access to Entry Club human support for high-priority business guidance.</Text>
                    <Button
                        title="Start Chat"
                        onPress={() => router.push('/(host)/support-chat')}
                        style={styles.chatBtn}
                        textStyle={{ color: '#000000' }}
                    />
                </View>

                <View style={styles.menu}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => setShowTicketModal(true)}>
                        <View style={styles.menuIconBox}>
                            <Ionicons name="ticket-outline" size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.menuTextContent}>
                            <Text style={styles.menuText}>Raise a Ticket</Text>
                            <Text style={styles.menuSubtext}>Contact human support for complex issues</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(host)/ticket-history')}>
                        <View style={styles.menuIconBox}>
                            <Ionicons name="time-outline" size={24} color={COLORS.gold} />
                        </View>
                        <View style={styles.menuTextContent}>
                            <Text style={styles.menuText}>Ticket History</Text>
                            <Text style={styles.menuSubtext}>View status of your previous requests</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.faqSection}>
                    <Text style={styles.sectionTitle}>Frequently Asked</Text>
                    <View style={styles.faqCard}>
                        <Text style={styles.faqQuestion}>How do I manage payouts?</Text>
                        <Text style={styles.faqAnswer}>Navigate to Payout History to see your earnings and request withdrawals.</Text>
                    </View>
                    <View style={styles.faqCard}>
                        <Text style={styles.faqQuestion}>Adding staff members</Text>
                        <Text style={styles.faqAnswer}>Use Staff Management to add emails for your team members.</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Raise Ticket Modal */}
            <Modal visible={showTicketModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Raise Support Ticket</Text>
                            <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <Input
                            label="Subject"
                            value={ticket.subject}
                            onChangeText={(t) => setTicket({ ...ticket, subject: t })}
                            placeholder="e.g. Payment Issue"
                        />
                        <Input
                            label="Description"
                            value={ticket.description}
                            onChangeText={(t) => setTicket({ ...ticket, description: t })}
                            placeholder="Provide details about your issue..."
                            multiline
                        />

                        <Button
                            title={submitting ? "Submitting..." : "Submit Ticket"}
                            onPress={handleRaiseTicket}
                            loading={submitting}
                            style={{ marginTop: 20 }}
                        />
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md, // Increased
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    card: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
    },
    aiCard: {
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    aiIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    aiTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
    },
    aiDescription: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    chatBtn: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    menu: {
        gap: 12,
        marginBottom: 32,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menuIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    menuTextContent: {
        flex: 1,
    },
    menuText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    menuSubtext: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 2,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
    },
    faqSection: {
        gap: 12,
    },
    faqCard: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    faqQuestion: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6,
    },
    faqAnswer: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        lineHeight: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0D0D0D',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: SPACING.lg,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '800',
    },
});
