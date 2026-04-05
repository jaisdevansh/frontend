import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/design-system';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';

export default function StaffTabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#7E51FB',
                tabBarInactiveTintColor: '#BBBBBB',
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tabs.Screen
                name="available"
                options={{
                    title: 'Pool',
                    tabBarLabel: 'Pool',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="list-sharp" size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="scanner"
                options={{
                    title: 'Scan',
                    tabBarLabel: 'Scan',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="scan-sharp" size={28} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="my-orders"
                options={{
                    title: 'Orders',
                    tabBarLabel: 'My Task',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="cart-sharp" size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarLabel: 'Me',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="person-sharp" size={26} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#1C1C1E',
        height: 82,
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        borderRadius: 41,
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        paddingBottom: 16,
        paddingTop: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.8,
        textTransform: 'uppercase'
    }
});
