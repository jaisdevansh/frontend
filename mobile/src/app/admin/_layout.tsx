import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';


const COLORS = {
    primary: '#3b82f6',
    backgroundDark: '#000000',
    sidebarBg: '#080808',
    bottomNavBg: '#0a0a0a',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
    activeTab: 'rgba(126, 81, 251, 0.15)',
    border: 'rgba(255,255,255,0.06)'
};

export default function AdminRootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();
    const { logout } = useAuth();
    
    const currentTab = segments[segments.length - 1] || 'dashboard';

    const navigationItems = [
        { name: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard', key: 'dashboard' },
        { name: 'Analytics', icon: 'bar-chart', route: '/admin/analytics', key: 'analytics' },
        { name: 'Bookings', icon: 'confirmation-number', route: '/admin/bookings', key: 'bookings' },
        { name: 'Settings', icon: 'settings', route: '/admin/settings', key: 'settings' },
    ];

    const handleLogout = async () => {
        await logout(true);
        router.replace('/(auth)/login');
    };

    // Always render MOBILE LAYOUT (Bottom Tabs) on device
    return (
        <View style={styles.mobileContainer}>
            <View style={styles.mainContent}>
                <Slot />
            </View>

            {/* Premium Bottom Nav */}
            <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
                {navigationItems.map((item) => {
                    const isActive = currentTab === item.key;
                    return (
                        <TouchableOpacity 
                            key={item.key}
                            style={styles.bottomNavItem} 
                            onPress={() => router.push(item.route as any)}
                        >
                            <View style={[styles.tabIconCircle, isActive && styles.tabIconCircleActive]}>
                                <MaterialIcons 
                                    name={item.icon as any} 
                                    size={24} 
                                    color={isActive ? COLORS.primary : COLORS.textDim} 
                                />
                            </View>
                            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{item.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    desktopContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.backgroundDark,
    },
    mobileContainer: {
        flex: 1,
        backgroundColor: COLORS.backgroundDark,
    },
    sidebar: {
        width: 280,
        backgroundColor: COLORS.sidebarBg,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    logoGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        marginLeft: 8,
    },
    logoIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        marginLeft: 14,
        color: COLORS.textWhite,
        fontWeight: '900',
        fontSize: 18,
        letterSpacing: 0.5,
    },
    navGroup: {
        flex: 1,
        gap: 6,
    },
    sideNavItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    sideNavItemActive: {
        backgroundColor: COLORS.activeTab,
    },
    sideNavText: {
        marginLeft: 14,
        color: COLORS.textDim,
        fontSize: 15,
        fontWeight: '600',
    },
    sideNavTextActive: {
        color: COLORS.primary,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    logoutText: {
        marginLeft: 12,
        color: COLORS.textDim,
        fontSize: 14,
        fontWeight: '700',
    },
    mainContent: {
        flex: 1,
    },
    // Mobile Bottom Nav
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: COLORS.bottomNavBg,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
        paddingHorizontal: 4,
    },
    bottomNavItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    tabIconCircle: {
        width: 44,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabIconCircleActive: {
        backgroundColor: COLORS.activeTab,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textDim,
    },
    tabLabelActive: {
        color: COLORS.primary,
        fontWeight: '900',
    },
    fabOrb: {
        position: 'absolute',
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    }
});
