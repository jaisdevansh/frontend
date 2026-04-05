import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure how notifications are displayed when the app is in the foreground
if (!isExpoGo) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}


export const useNotifications = () => {
    const auth: any = useAuth();
    const token = auth?.token;
    const role = auth?.role;
    
    const router: any = useRouter();
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    useEffect(() => {
        if (token) {
            registerForPushNotificationsAsync();
        }

        if (!isExpoGo) {
            // Listen for when a notification is received in the foreground
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                console.log('[Push] Received in foreground:', notification);
            });

            // Listen for when a user interacts with a notification (taps it)
            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                const data = response.notification.request.content.data;
                console.log('[Push] Notification interaction:', data);

                // Handle Navigation based on notification data
                handleNavigation(data);
            });
        }

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [token]);

    const handleNavigation = (data: any) => {
        if (!data) return;

        switch (data.type) {
            case 'order':
            case 'order_status':
                if (auth.role === 'staff') {
                    router.push('/(staff)/dashboard');
                } else {
                    router.push('/(user)/my-bookings'); 
                }
                break;
            case 'issue':
                if (auth.role === 'staff') {
                    router.push('/(staff)/dashboard');
                }
                break;
            case 'booking':
                router.push('/(user)/my-bookings');
                break;
            case 'location_reveal':
                if (data.eventId) {
                    router.push(`/(user)/event-details?id=${data.eventId}`);
                }
                break;
            default:
                console.log('[Push] No specific navigation for type:', data.type);
        }
    };

    return null;
};
