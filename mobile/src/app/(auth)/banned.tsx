import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function AccountBanned() {
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
                        <Ionicons name="warning" size={80} color="#FF3B30" />
                    </View>
                </View>
                
                <Text style={styles.title}>Account Banned</Text>
                <View style={styles.divider} />

                <Text style={styles.description}>
                    Your account has been permanently disabled due to a severe violation of Entry Club’s Community Guidelines or Terms of Service. 
                </Text>
                
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={24} color="#FF3B30" />
                    <View style={styles.infoBoxText}>
                        <Text style={styles.infoTitle}>What this means:</Text>
                        <Text style={styles.infoSubtitle}>You are no longer able to log in, discover venues, or access premium events on this device or with these credentials.</Text>
                    </View>
                </View>

                {/* If there's an appeal process, it can go here */}
                <Text style={styles.appealText}>
                    If you believe this was an error, please contact our support team to submit a formal appeal.
                </Text>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.appealBtn} activeOpacity={0.8}>
                    <Text style={styles.appealBtnText}>Contact Support</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <Text style={styles.logoutBtnText}>Log Out</Text>
                    <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.5)" />
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
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingBottom: 40,
    },
    iconContainer: {
        marginBottom: SPACING.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGlow: {
        padding: 30,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 59, 48, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.2)',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    divider: {
        width: 60,
        height: 3,
        backgroundColor: '#FF3B30',
        borderRadius: 2,
        marginBottom: SPACING.xl,
    },
    description: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 32,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 59, 48, 0.05)',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.15)',
        marginBottom: 32,
        alignItems: 'flex-start',
    },
    infoBoxText: {
        flex: 1,
        marginLeft: 12,
    },
    infoTitle: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    infoSubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        lineHeight: 20,
    },
    appealText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING.lg + 20,
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    appealBtn: {
        backgroundColor: '#FF3B30',
        paddingVertical: 16,
        borderRadius: 100,
        alignItems: 'center',
        marginBottom: 16,
    },
    appealBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
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
