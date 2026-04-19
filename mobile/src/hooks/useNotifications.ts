import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
    registerForPushNotificationsAsync,
    deregisterPushTokenAsync,
} from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ── Configure foreground notification display (non-Expo Go builds only) ──────
// We set shouldShowAlert: false because NotificationContext renders our own
// custom in-app banner — so the system alert would be a duplicate.
if (!isExpoGo) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: false,  // Custom banner handles this
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: false, // Custom banner handles this
            shouldShowList: true,    // Show in notification tray (background)
        }),
    });
}

export const useNotifications = () => {
    const auth: any = useAuth();
    const token = auth?.token;
    const router: any = useRouter();

    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);
    const fcmTokenRef = useRef<string | null>(null);

    // ── Register on login ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return;

        registerForPushNotificationsAsync().then((fcmToken) => {
            if (fcmToken) {
                fcmTokenRef.current = fcmToken;
            }
        });
    }, [token]);

    // ── Deregister on logout ──────────────────────────────────────────────────
    useEffect(() => {
        if (token) return; // Still logged in

        // token became null/undefined → user logged out
        if (fcmTokenRef.current) {
            deregisterPushTokenAsync(fcmTokenRef.current);
            fcmTokenRef.current = null;
        }
    }, [token]);

    // ── Navigation handler ────────────────────────────────────────────────────
    const handleNavigation = useCallback((data: any) => {
        if (!data) return;

        const role = auth?.role;

        switch (data.type) {
            case 'order':
            case 'order_status':
                router.push(role === 'staff' ? '/(staff)/dashboard' : '/(user)/my-bookings');
                break;
            case 'issue':
                if (role === 'staff') router.push('/(staff)/dashboard');
                break;
            case 'booking':
                router.push('/(user)/my-bookings');
                break;
            case 'location_reveal':
                if (data.eventId) {
                    router.push(`/(user)/event-details?id=${data.eventId}`);
                }
                break;
            case 'security_alert':
                if (role === 'security' || role === 'staff') {
                    router.push('/(staff)/security');
                }
                break;
            default:
                console.log('[Push] No specific navigation for type:', data.type);
        }
    }, [auth?.role, router]);

    // ── Listeners (foreground received + tap response) ────────────────────────
    useEffect(() => {
        if (isExpoGo) return;

        // Received while app is in foreground (NotificationContext banner handles display)
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('[Push] Received in foreground:', notification.request.identifier);
        });

        // User tapped on a notification (from background or killed state)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            console.log('[Push] Tapped:', data?.type);
            handleNavigation(data);
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [handleNavigation]);

    return null;
};
