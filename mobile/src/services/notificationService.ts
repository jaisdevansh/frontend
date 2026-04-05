import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import apiClient from './apiClient';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Registers device for push notifications.
 * - Asks permission if needed
 * - Gets Expo Push Token
 * - Sends token to backend
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    if (isExpoGo) {
        console.log('[Push] Remote push notifications are not supported in Expo Go (SDK 53+). Skipping registration.');
        return null;
    }

    if (!Device.isDevice) {
        console.warn('[Push] Must use physical device for push notifications');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[Push] Permission not granted');
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Entry Club Updates',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7C3AED',
            sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('orders', {
            name: 'Order Alerts 🍹',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 300, 200, 300],
            lightColor: '#F59E0B',
        });
        await Notifications.setNotificationChannelAsync('security', {
            name: 'Safety Alerts 🚨',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 500, 200, 500],
            lightColor: '#FF4444',
        });
    }

    try {
        // Get native device push token (FCM for Android, APNs for iOS)
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const token = tokenData.data;
        console.log('[Push] Native Push Token:', token);

        // Send to backend
        await apiClient.post('/api/v1/notifications/register-token', { 
            fcmToken: token,
            platform: Platform.OS 
        });

        return token;
    } catch (err) {
        console.log('[Push] Failed to get push token:', err instanceof Error ? err.message : String(err));
        return null;
    }
};

/**
 * Schedules an immediate local notification (works while app is open).
 */
export const showLocalNotification = async (
    title: string,
    body: string,
    type: 'CHAT' | 'ORDER' | 'ALERT' | 'INFO' = 'ALERT',
    data: Record<string, any> = {}
) => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: 'default',
            data: { type, ...data },
        },
        trigger: null, // Fire immediately
    });
};
