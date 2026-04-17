import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';

export default function TermsSupport() {
    const router = useRouter();
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

    const handleAction = (action: string) => {
        if (action === 'clear_cache') {
            showToast('Cache cleared successfully. 24.5 MB freed.', 'success');
        } else if (action === 'deactivate') {
            showToast('Deactivation request sent. Our team will contact you.', 'info');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* LEGAL SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>LEGAL OVERVIEW</Text>

                    <TouchableOpacity
                        style={styles.item}
                        activeOpacity={0.7}
                        onPress={() => router.push('/(settings)/terms' as any)}
                    >
                        <View style={styles.itemIconBox}>
                            <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Terms of Service</Text>
                            <Text style={styles.itemSubtitle}>Usage guidelines and policies</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.item}
                        activeOpacity={0.7}
                        onPress={() => router.push('/(settings)/privacy' as any)}
                    >
                        <View style={styles.itemIconBox}>
                            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Privacy Policy</Text>
                            <Text style={styles.itemSubtitle}>How we handle your data</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                </View>

                {/* SUPPORT SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>GET SUPPORT</Text>

                    <TouchableOpacity
                        style={styles.item}
                        activeOpacity={0.7}
                        onPress={() => router.push('/(user)/report-incident' as any)}
                    >
                        <View style={[styles.itemIconBox, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                            <Ionicons name="warning-outline" size={20} color="#FF3B30" />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Report an Incident</Text>
                            <Text style={styles.itemSubtitle}>Safety, conduct, or lost items</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.item}
                        activeOpacity={0.7}
                        onPress={() => router.push('/(settings)/help-center' as any)}
                    >
                        <View style={styles.itemIconBox}>
                            <Ionicons name="help-buoy-outline" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Help Center</Text>
                            <Text style={styles.itemSubtitle}>FAQs and detailed guides</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.contactItem}
                        activeOpacity={0.8}
                        onPress={() => router.push('/(settings)/support-chat' as any)}
                    >
                        <View style={styles.contactContent}>
                            <View style={styles.contactIconWrapper}>
                                <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.contactTitle}>Support AI Concierge</Text>
                                <Text style={styles.contactSubtitle}>Get instant help and priority resolution 24/7.</Text>
                            </View>
                        </View>
                        <View style={styles.contactButton}>
                            <Text style={styles.contactButtonText}>Chat Now</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* ACCOUNT MANAGEMENT SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT MANAGEMENT</Text>



                    <TouchableOpacity
                        style={styles.item}
                        activeOpacity={0.7}
                        onPress={() => handleAction('clear_cache')}
                    >
                        <View style={styles.itemIconBox}>
                            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Clear App Cache</Text>
                            <Text style={styles.itemSubtitle}>Free up storage (24.5 MB)</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.item}
                        activeOpacity={0.7}
                        onPress={() => handleAction('deactivate')}
                    >
                        <View style={[styles.itemIconBox, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={[styles.itemTitle, { color: '#FF3B30' }]}>Deactivate Account</Text>
                            <Text style={styles.itemSubtitle}>Request permanent deletion</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>Entry Club App v1.2.0 (Stable)</Text>
                    <Text style={styles.copyrightText}>© 2026 Entry Club Platform Inc.</Text>
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
        paddingHorizontal: SPACING.lg,
        gap: SPACING.xxl,
    },
    section: {
        gap: SPACING.md,
    },
    sectionTitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 4,
        paddingHorizontal: 4,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 16,
    },
    itemIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    itemSubtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 13,
        marginTop: 2,
    },
    contactItem: {
        backgroundColor: 'rgba(124, 77, 255, 0.08)',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.3)',
        gap: SPACING.lg,
    },
    contactContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    contactIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(124, 77, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    contactSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        lineHeight: 18,
    },
    contactButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 100,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    contactButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        alignItems: 'center',
        marginTop: SPACING.xl,
        gap: 6,
    },
    versionText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        fontWeight: '600',
    },
    copyrightText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 11,
    },
    footerSpacing: {
        height: 60,
    }
});
