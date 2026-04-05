import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function AccountSuspended() {
    const router = useRouter();
    const { logout } = useAuth();

    const handleLogout = async () => {
        try {
            await authService.logout();
            await logout();
            router.replace('/(auth)/welcome');
        } catch (e) {
            await logout();
            router.replace('/(auth)/welcome');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} bounces={false}>
                <View style={styles.iconContainer}>
                    <View style={styles.iconGlow}>
                        <Ionicons name="lock-closed" size={72} color={COLORS.gold} />
                    </View>
                </View>
                
                <Text style={styles.title}>Account Suspended</Text>
                <View style={styles.divider} />

                <Text style={styles.description}>
                    Your account has been temporarily suspended while our team reviews recent activity.
                </Text>

                <View style={styles.timelineBox}>
                    <View style={styles.timelineItem}>
                        <View style={styles.dotActive} />
                        <View style={styles.timelineLine} />
                        <Text style={styles.timelineText}>Suspension Issued</Text>
                    </View>
                    <View style={styles.timelineItem}>
                        <View style={styles.dotActive} />
                        <View style={styles.timelineLine} />
                        <Text style={styles.timelineText}>Under Investigation</Text>
                    </View>
                    <View style={styles.timelineItem}>
                        <View style={styles.dotPending} />
                        <Text style={styles.timelineTextPending}>Resolution Expected (24-48hrs)</Text>
                    </View>
                </View>

                <Text style={styles.appealText}>
                    Please check your registered email address for specific details regarding the status of your account.
                </Text>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.appealBtn} activeOpacity={0.8}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.background.dark} style={{marginRight: 8}} />
                    <Text style={styles.appealBtnText}>Contact Support</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <Text style={styles.logoutBtnText}>Switch Account</Text>
                    <Ionicons name="swap-horizontal-outline" size={18} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
        paddingBottom: 40,
    },
    iconContainer: {
        marginBottom: SPACING.xxl,
        alignItems: 'center',
    },
    iconGlow: {
        padding: 30,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    divider: {
        width: 60,
        height: 3,
        backgroundColor: COLORS.gold,
        borderRadius: 2,
        marginBottom: SPACING.xl,
        alignSelf: 'center',
    },
    description: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 32,
    },
    timelineBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 32,
        marginHorizontal: SPACING.md,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        position: 'relative',
    },
    dotActive: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.gold,
        marginTop: 4,
        zIndex: 1,
    },
    dotPending: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: 4,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        zIndex: 1,
    },
    timelineLine: {
        position: 'absolute',
        top: 16,
        left: 5,
        width: 2,
        height: 30,
        backgroundColor: 'rgba(255, 215, 0, 0.3)',
    },
    timelineText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 16,
    },
    timelineTextPending: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 16,
    },
    appealText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: SPACING.md,
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING.lg + 20,
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    appealBtn: {
        backgroundColor: COLORS.gold,
        paddingVertical: 16,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 16,
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    appealBtnText: {
        color: COLORS.background.dark,
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    logoutBtn: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    logoutBtnText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 16,
        fontWeight: '600',
    }
});
