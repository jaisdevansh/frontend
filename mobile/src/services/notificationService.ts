import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import apiClient from './apiClient';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ─── Production-grade Push Notification Service ──────────────────────────────
// Uses native FCM token (not Expo push token) for direct Firebase delivery.
// Works only in dev builds and production builds (not Expo Go).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets up Android notification channels (must run before any notification).
 * Safe to call multiple times — Android deduplicates by channelId.
 */
const setupAndroidChannels = async () => {
    if (Platform.OS !== 'android') return;

    await Promise.all([
        Notifications.setNotificationChannelAsync('default', {
            name: 'Entry Club Updates',
            description: 'General updates from Entry Club',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7C3AED',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        }),
        Notifications.setNotificationChannelAsync('orders', {
            name: 'Order Alerts 🍹',
            description: 'Real-time updates for your food and drink orders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 300, 200, 300],
            lightColor: '#F59E0B',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        }),
        Notifications.setNotificationChannelAsync('booking', {
            name: 'Booking Alerts 🎟️',
            description: 'Updates about your event bookings',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 400, 200, 400],
            lightColor: '#10B981',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        }),
        Notifications.setNotificationChannelAsync('security', {
            name: 'Safety Alerts 🚨',
            description: 'Critical safety notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 200, 500],
            lightColor: '#FF4444',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            bypassDnd: true,
        }),
        Notifications.setNotificationChannelAsync('location', {
            name: 'Location Reveals 📍',
            description: 'Venue location revealed for your event',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 300, 100, 300, 100, 300],
            lightColor: '#3B82F6',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        }),
    ]);

    console.log('[Push] Android notification channels configured ✅');
};

/**
 * Registers device for push notifications.
 * - Asks for permission if not already granted
 * - Gets native FCM token (direct Firebase delivery — no Expo proxy)
 * - Sends token to backend for storage
 * - Silently retries stale-token cleanup on the server
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    if (isExpoGo) {
        console.log('[Push] Skipped: Expo Go does not support FCM (SDK 53+). Use a dev/production build.');
        return null;
    }

    if (!Device.isDevice) {
        console.warn('[Push] Skipped: Push notifications require a physical device.');
        return null;
    }

    // ── Permission ────────────────────────────────────────────────────────────
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[Push] Permission denied by user.');
        return null;
    }

    // ── Android Channels ─────────────────────────────────────────────────────
    await setupAndroidChannels();

    // ── Get Native FCM Token ──────────────────────────────────────────────────
    try {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const fcmToken = tokenData.data;

        if (!fcmToken) {
            console.warn('[Push] Got empty FCM token — skipping registration.');
            return null;
        }

        console.log('[Push] FCM Token acquired ✅');

        // ── Register to Backend ──────────────────────────────────────────────
        await apiClient.post('/api/v1/notifications/register-token', {
            fcmToken,
            platform: Platform.OS,
        });

        console.log('[Push] Token registered with backend ✅');
        return fcmToken;
    } catch (err: any) {
        // Check if it's a Firebase project mismatch (common if google-services.json is wrong)
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('google-services') || msg.includes('SENDER_ID') || msg.includes('project')) {
            console.error('[Push] ❌ google-services.json mismatch. Check package_name matches app package.');
        } else {
            console.error('[Push] Token registration failed:', msg);
        }
        return null;
    }
};

/**
 * Deregisters the device token from the backend on logout.
 * Prevents notifications to logged-out devices.
 */
export const deregisterPushTokenAsync = async (fcmToken: string): Promise<void> => {
    if (!fcmToken) return;
    try {
        await apiClient.post('/api/v1/notifications/delete-token', { fcmToken });
        console.log('[Push] Token deregistered on logout ✅');
    } catch (err) {
        // Non-critical — silent fail
        console.warn('[Push] Failed to deregister token:', err instanceof Error ? err.message : err);
    }
};

/**
 * Shows an immediate local notification (works even in Expo Go).
 * Use this for in-app real-time feedback (e.g. order updates via socket).
 */
export const showLocalNotification = async (
    title: string,
    body: string,
    type: 'CHAT' | 'ORDER' | 'ALERT' | 'INFO' | 'SUCCESS' = 'ALERT',
    data: Record<string, any> = {}
): Promise<void> => {
    // Map notification type to the correct Android channel
    const channelMap: Record<string, string> = {
        ORDER: 'orders',
        ALERT: 'security',
        CHAT: 'default',
        INFO: 'default',
        SUCCESS: 'booking',
    };

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: 'default',
            data: { type, ...data },
            ...(Platform.OS === 'android' && { channelId: channelMap[type] || 'default' }),
        },
        trigger: null, // Fire immediately
    });
};
