import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/design-system';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function UserTabsLayout() {
    const insets = useSafeAreaInsets();
    // Dynamic calculation for bottom padding to avoid 3-button navigation bar overlap on Android
    const bottomPadding = Platform.OS === 'ios' ? insets.bottom : Math.max(12, insets.bottom + 4);
    const tabHeight = Platform.OS === 'ios' ? 90 : 56 + bottomPadding;

    return (

        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#030303',
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255, 255, 255, 0.05)',
                    height: tabHeight,
                    paddingTop: 8,
                    paddingBottom: bottomPadding,
                },

                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 4,
                    marginBottom: Platform.OS === 'ios' ? 0 : 4,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
                    ),
                }}
                listeners={() => ({
                    tabPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    },
                })}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Discover',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
                    ),
                }}
                listeners={() => ({
                    tabPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    },
                })}
            />
            <Tabs.Screen
                name="my-bookings"
                options={{
                    title: 'My Bookings',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "ticket" : "ticket-outline"} size={24} color={color} />
                    ),
                }}
                listeners={() => ({
                    tabPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    },
                })}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
                    ),
                }}
                listeners={() => ({
                    tabPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    },
                })}
            />

            {/* HIDE NON-TAB SCREENS FROM THE TAB BAR */}
            <Tabs.Screen name="chat/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="my-reviews" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="edit-review" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="venue-details" options={{ href: null }} />
            <Tabs.Screen name="event-details" options={{ href: null }} />
            <Tabs.Screen name="ticket-selection" options={{ href: null }} />
            <Tabs.Screen name="payment" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="booking-success" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="table-pass" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="floor-plan" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="menu" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="split-payment" options={{ href: null }} />
            <Tabs.Screen name="my-orders" options={{ href: null }} />

            <Tabs.Screen name="verification" options={{ href: null }} />
            <Tabs.Screen name="write-review" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="app-rating" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="entry-denied" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="change-password" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="notifications" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="referral" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="rewards" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="report-incident" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="split-request-received" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="support-resolved" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="waitlist-status" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="waitlist-upgrade" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="venue-reviews" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        </Tabs>
    );
}
