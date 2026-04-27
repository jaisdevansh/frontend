import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Share, Modal, Linking, Image, InteractionManager, KeyboardAvoidingView } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import apiClient from '../../services/apiClient';
import SafeFlashList from '../../components/SafeFlashList';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../../hooks/economics';

const FlashList = SafeFlashList;

interface ContactItemProps {
    contact: Contacts.Contact;
    onInvite: (contact: Contacts.Contact) => void;
    isInvited: boolean;
}

// Memoized Contact Item for extreme performance
const ContactItem = React.memo(({ contact, onInvite, isInvited }: ContactItemProps) => {
    const contactId = (contact as any).id || (contact as any).contactId || '';
    return (
        <View style={styles.contactItem}>
            <View style={styles.contactAvatar}>
                <Text style={styles.avatarTxt}>
                    {(contact.name || '?')[0].toUpperCase()}
                </Text>
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                <Text style={styles.contactPhone} numberOfLines={1}>
                    {contact.phoneNumbers?.[0]?.number}
                </Text>
            </View>
            <TouchableOpacity 
                style={[
                    styles.inviteTagBtn,
                    isInvited && styles.invitedBtn
                ]}
                onPress={() => onInvite(contact)}
                disabled={isInvited}
            >
                <Text style={[
                    styles.inviteTagTxt,
                    isInvited && styles.invitedTxt
                ]}>
                    {isInvited ? 'Invited' : 'Invite'}
                </Text>
            </TouchableOpacity>
        </View>
    );
});

export default function ReferralScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    // Bypass buggy Expo Router back behavior which defaults to home tab
    const handleBack = React.useCallback(() => {
        router.navigate('/(user)/profile');
        return true; 
    }, [router]);

    React.useEffect(() => {
        const { BackHandler } = require('react-native');
        const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
        return () => sub.remove();
    }, [handleBack]);

    const [inputCode, setInputCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [referralCode, setReferralCode] = useState('');
    const [points, setPoints] = useState(0);
    const [referralCount, setReferralCount] = useState(0);
    
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [invitedContactName, setInvitedContactName] = useState('');

    const { data: wallet } = useWallet();

    const displayPoints = wallet?.points ?? points;
    
    // Contact State
    const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [contactsLoading, setContactsLoading] = useState(false);
    const [invitedContacts, setInvitedContacts] = useState<Set<string>>(new Set());

    useEffect(() => {
        InteractionManager.runAfterInteractions(() => {
            fetchContacts();
        });
    }, []);

    const fetchContacts = async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                setContactsLoading(true);
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
                });
                
                if (data.length > 0) {
                    // Filter contacts that have at least one phone number
                    const filtered = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    setContacts(filtered);
                }
            }
        } catch (error) {
            // Ignore for clean UI
        } finally {
            setContactsLoading(false);
        }
    };

    const handleInviteContact = async (contact: Contacts.Contact) => {
        const phoneNumber = contact.phoneNumbers?.[0]?.number;
        if (!phoneNumber) return;

        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            const message = `Join me on Entry Club! Use my code ${referralCode} to get 50 bonus points. Download here: https://entry-user-backend-mpft.onrender.com/invite/${referralCode}`;
            const { result } = await SMS.sendSMSAsync([phoneNumber], message);
            const contactId = (contact as any).id || (contact as any).contactId || '';
            if (result === 'sent' && contactId) {
                setInvitedContacts(prev => new Set(prev).add(contactId));
                setInvitedContactName(contact.name || 'your friend');
                setShowSuccessModal(true);
            }
        } else {
            showToast('SMS is not available on this device', 'error');
        }
    };

    const filteredContacts = contacts.filter(c => 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phoneNumbers?.[0]?.number || '').includes(searchQuery)
    ).slice(0, searchQuery.trim() ? 50 : 5);

    useEffect(() => {
        const fetchReferralData = async () => {
            try {
                const res = await apiClient.get('/user/referral');
                if (res.data.success) {
                    setReferralCode(res.data.data.referralCode);
                    setPoints(res.data.data.loyaltyPoints || 0);
                    setReferralCount(res.data.data.referralsCount || 0);
                }
            } catch (error) {
                showToast('Failed to load referral data', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchReferralData();
    }, []);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join Entry Club and discover the best nightlife! Use my referral code: ${referralCode} to get 50 bonus points on signup. https://entry-user-backend-mpft.onrender.com/invite/${referralCode}`,
            });
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleWhatsAppShare = () => {
        const message = `Join Entry Club and discover the best nightlife! Use my referral code: ${referralCode} to get 50 bonus points on signup. https://entry-user-backend-mpft.onrender.com/invite/${referralCode}`;
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(() => {
            showToast('WhatsApp is not installed on this device', 'error');
        });
    };

    const handleApplyCode = async () => {
        if (!inputCode.trim()) {
            return showToast('Please enter a valid code', 'info');
        }
        setSubmitting(true);
        try {
            const res = await apiClient.post('/user/referral/apply', { code: inputCode.trim() });
            if (res.data.success) {
                showToast(res.data.message, 'success');
                // Sync with backend source of truth for high fidelity
                if (res.data.data?.loyaltyPoints !== undefined) {
                    setPoints(res.data.data.loyaltyPoints);
                } else {
                    setPoints((prev) => prev + 50);
                }
                setInputCode('');
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to apply code', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite & Earn</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Points Hero */}
                <View style={styles.heroCard}>
                    <View style={styles.iconGlow}>
                        <Ionicons name="gift" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.pointsLabel}>YOUR LOYALTY POINTS</Text>
                    <Text style={styles.pointsValue}>{displayPoints}</Text>
                    
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNum}>{referralCount}</Text>
                            <Text style={styles.statTitle}>Friends Invited</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statNum}>₹{(displayPoints * 10).toLocaleString()}</Text>
                            <Text style={styles.statTitle}>Value Earned</Text>
                        </View>
                    </View>
                </View>

                {/* Reward Info Banner */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(124,77,255,0.08)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(124,77,255,0.2)', alignItems: 'center' }}>
                        <Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '900' }}>200</Text>
                        <Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>PTS</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', marginTop: 4 }}>You earn when{'\n'}friend books</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', alignItems: 'center' }}>
                        <Text style={{ color: '#22c55e', fontSize: 22, fontWeight: '900' }}>50</Text>
                        <Text style={{ color: '#22c55e', fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>PTS</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', marginTop: 4 }}>Friend gets on{'\n'}signup</Text>
                    </View>
                </View>


                {/* Invite Code */}
                <Text style={styles.sectionLabel}>YOUR INVITE CODE</Text>
                <View style={styles.codeContainer}>
                    <Text style={styles.codeText}>{referralCode}</Text>
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                        <Ionicons name="share-social" size={20} color={COLORS.background.dark} />
                        <Text style={styles.shareText}>Share</Text>
                    </TouchableOpacity>
                </View>



                {/* Contacts Invitation Section */}
                <View style={styles.contactsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>INVITE FROM CONTACTS</Text>
                        <TouchableOpacity onPress={fetchContacts}>
                            <Ionicons name="refresh" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.contactSearchWrapper}>
                        <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
                        <TextInput
                            style={styles.contactSearchInput}
                            placeholder="Search friends to invite..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {contactsLoading ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                    ) : (
                        <View style={styles.contactsList}>
                            {filteredContacts.length > 0 ? (
                                <View style={{ width: '100%' }}>
                                    {filteredContacts.map((item) => {
                                        const key = (item as any).id || (item as any).contactId || Math.random().toString();
                                        return (
                                            <ContactItem 
                                                key={key}
                                                contact={item} 
                                                onInvite={handleInviteContact} 
                                                isInvited={invitedContacts.has(key)} 
                                            />
                                        );
                                    })}
                                </View>
                            ) : (
                                <Text style={styles.emptyContacts}>No contacts found</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Redeem Form */}
                <View style={[styles.redeemSection, { marginTop: SPACING.xl }]}>
                    <Text style={styles.redeemTitle}>Have a referral code?</Text>
                    <Text style={styles.redeemSubtitle}>Enter a friend's code to get 50 bonus points immediately.</Text>
                    
                    <View style={styles.inputWrapper}>
                        <View style={styles.inputIcon}>
                            <Ionicons name="barcode-outline" size={20} color="rgba(255,255,255,0.4)" />
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Code (e.g., AXYZ123)"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={inputCode}
                            onChangeText={setInputCode}
                            autoCapitalize="characters"
                            maxLength={16}
                        />
                        <TouchableOpacity 
                            style={[styles.applyBtn, !inputCode.trim() && { opacity: 0.5 }]} 
                            disabled={!inputCode.trim() || submitting}
                            onPress={handleApplyCode}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#030303" size="small" />
                            ) : (
                                <Text style={styles.applyBtnText}>Apply</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Premium Full-Screen Success Modal */}
            <Modal visible={showSuccessModal} animationType="slide">
                <SafeAreaView style={styles.successScreen}>
                    {/* Header */}
                    <View style={styles.successHeader}>
                        <TouchableOpacity style={styles.successCloseBtn} onPress={() => setShowSuccessModal(false)}>
                            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                        <Text style={styles.successHeaderTitle}>NIGHTLIFE ELITE</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.successContent}>
                        {/* Glowing Mail Icon */}
                        <View style={styles.glowWrapper}>
                            <View style={styles.mailIconContainer}>
                                <Ionicons name="mail" size={44} color="#FFFFFF" />
                            </View>
                        </View>

                        {/* Title & Subtitle */}
                        <Text style={styles.successTitle}>Invitation Sent</Text>
                        <Text style={styles.successSubtitle}>
                            We've notified <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{invitedContactName}</Text> to{'\n'}join the club.
                        </Text>

                        {/* Verification Card */}
                        <View style={styles.verificationCard}>
                            <View style={styles.vCardHeader}>
                                <View style={styles.vCardLeft}>
                                    <Ionicons name="document-text-outline" size={18} color="#A78BFA" />
                                    <Text style={styles.vCardTitle}>Waiting for verification</Text>
                                </View>
                                <Text style={styles.stepBadge}>STEP 02/03</Text>
                            </View>

                            <View style={styles.progressBarBg}>
                                <View style={styles.progressBarFill} />
                            </View>

                            <Text style={styles.vCardNotice}>VERIFICATION USUALLY TAKES LESS THAN 24 HOURS</Text>
                        </View>
                    </View>

                    {/* Footer Actions */}
                    <View style={styles.successFooter}>
                        <TouchableOpacity style={styles.shareWhatsAppBtn} onPress={handleWhatsAppShare} activeOpacity={0.8}>
                            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.shareWhatsAppTxt}>Share via WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.backDashboardBtn} onPress={() => { setShowSuccessModal(false); handleBack(); }}>
                            <Text style={styles.backDashboardTxt}>Back to Dashboard</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
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
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: 80,
    },
    heroCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: SPACING.lg,
    },
    iconGlow: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(124, 77, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.2)',
    },
    pointsLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 4,
    },
    pointsValue: {
        color: '#FFFFFF',
        fontSize: 40,
        fontWeight: '900',
        letterSpacing: -1,
        marginBottom: SPACING.lg,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignSelf: 'center',
    },
    statNum: {
        color: COLORS.primary,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 2,
    },
    statTitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '500',
    },
    sectionLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 8,
        marginLeft: 4,
    },
    codeContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(124, 77, 255, 0.05)',
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.2)',
        padding: 4,
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    codeText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 2,
        textAlign: 'center',
    },
    shareBtn: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.default,
        alignItems: 'center',
        gap: 8,
    },
    shareText: {
        color: COLORS.background.dark,
        fontSize: 14,
        fontWeight: '700',
    },
    redeemSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    redeemTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    redeemSubtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: SPACING.lg,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        paddingRight: 6,
        paddingVertical: 6,
    },
    inputIcon: {
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        height: 44,
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 1,
    },
    applyBtn: {
        backgroundColor: COLORS.primary,
        height: 44,
        paddingHorizontal: 24,
        borderRadius: BORDER_RADIUS.default,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    contactsSection: {
        marginBottom: SPACING.xxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 10,
    },
    contactSearchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: 16,
        marginBottom: 16,
        height: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    contactSearchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        marginLeft: 10,
    },
    contactsList: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        padding: 4,
        overflow: 'hidden',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    contactAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
    },
    avatarTxt: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '800',
    },
    contactInfo: {
        flex: 1,
        marginLeft: 12,
    },
    contactName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    contactPhone: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        marginTop: 2,
    },
    inviteTagBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '15',
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    invitedBtn: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    inviteTagTxt: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '800',
    },
    invitedTxt: {
        color: '#22c55e',
    },
    emptyContacts: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: 30,
    },
    
    // Premium Success Screen Styles
    successScreen: {
        flex: 1,
        backgroundColor: '#0F121B', // Deep dark blue matched to screenshot
    },
    successHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    successCloseBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successHeaderTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
    },
    successContent: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: '20%',
    },
    glowWrapper: {
        shadowColor: '#7C4DFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 15,
        marginBottom: 32,
    },
    mailIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 28,
        backgroundColor: '#7C4DFF', // Vibrant purple
        alignItems: 'center',
        justifyContent: 'center',
    },
    successTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    successSubtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 48,
    },
    verificationCard: {
        width: '100%',
        backgroundColor: '#1A1D29', // Card dark gray
        borderRadius: 16,
        padding: 24,
    },
    vCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    vCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vCardTitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    stepBadge: {
        color: '#A78BFA',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    progressBarBg: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginBottom: 20,
    },
    progressBarFill: {
        width: '66%',
        height: '100%',
        backgroundColor: '#7C4DFF',
        borderRadius: 2,
    },
    vCardNotice: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textAlign: 'center',
    },
    successFooter: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        width: '100%',
    },
    shareWhatsAppBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A1D29',
        borderRadius: 12,
        paddingVertical: 18,
        marginBottom: 24,
    },
    shareWhatsAppTxt: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginLeft: 10,
    },
    backDashboardBtn: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    backDashboardTxt: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontWeight: '600',
    }
});
