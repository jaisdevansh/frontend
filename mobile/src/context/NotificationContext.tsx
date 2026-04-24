import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, Animated, TouchableOpacity,
    Vibration, Platform, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { showLocalNotification } from '../services/notificationService';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const { width } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────
export type NotificationType = 'CHAT' | 'ORDER' | 'ALERT' | 'INFO' | 'SUCCESS';

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    type: NotificationType;
    data?: Record<string, any>;
    createdAt: Date;
}

interface NotificationContextType {
    unreadCount: number;
    notifications: AppNotification[];
    showBanner: (notification: AppNotification) => void;
    clearAll: () => void;
    markRead: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ─── Type Config ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    CHAT:    { icon: 'chatbubble-ellipses', color: '#60A5FA', bg: 'rgba(30,58,138,0.95)', border: '#3B82F6' },
    ORDER:   { icon: 'restaurant',          color: '#FBBF24', bg: 'rgba(120,53,15,0.95)', border: '#F59E0B' },
    ALERT:   { icon: 'notifications',       color: '#C084FC', bg: 'rgba(76,29,149,0.95)', border: '#8B5CF6' },
    INFO:    { icon: 'information-circle',  color: '#94A3B8', bg: 'rgba(15,23,42,0.95)', border: '#475569' },
    SUCCESS: { icon: 'checkmark-circle',    color: '#34D399', bg: 'rgba(6,78,59,0.95)', border: '#10B981' },
};

// ─── Deduplication ───────────────────────────────────────────────────────────
const DEDUP_WINDOW_MS = 3000;
const recentIds = new Map<string, number>();

const isDuplicate = (id: string): boolean => {
    const now = Date.now();
    if (recentIds.has(id)) return true;
    recentIds.set(id, now);
    setTimeout(() => recentIds.delete(id), DEDUP_WINDOW_MS);
    return false;
};

// ─── In-App Banner Component ─────────────────────────────────────────────────
const NotificationBanner: React.FC<{
    notification: AppNotification | null;
    onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-200)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!notification) return;

        // Slide in
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 16,
                stiffness: 200,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-dismiss after 4 seconds
        const timer = setTimeout(() => dismiss(), 4000);
        return () => clearTimeout(timer);
    }, [notification]);

    const dismiss = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -200,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onDismiss());
    };

    if (!notification) return null;

    const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.INFO;

    return (
        <Animated.View
            style={[
                styles.banner,
                {
                    top: insets.top + 8,
                    transform: [{ translateY }],
                    opacity,
                    backgroundColor: config.bg,
                    borderColor: config.border,
                }
            ]}
        >
            <View style={[styles.bannerIconWrap, { backgroundColor: config.color + '30' }]}>
                <Ionicons name={config.icon as any} size={22} color={config.color} />
            </View>
            <View style={styles.bannerTextWrap}>
                <Text style={styles.bannerTitle} numberOfLines={1}>{notification.title}</Text>
                <Text style={styles.bannerBody} numberOfLines={2}>{notification.body}</Text>
            </View>
            <TouchableOpacity onPress={dismiss} style={styles.bannerClose}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [currentBanner, setCurrentBanner] = useState<AppNotification | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const bannerQueue = useRef<AppNotification[]>([]);
    const isBannerShowing = useRef(false);

    const processQueue = useCallback(() => {
        if (bannerQueue.current.length === 0) {
            isBannerShowing.current = false;
            return;
        }
        isBannerShowing.current = true;
        const next = bannerQueue.current.shift()!;
        setCurrentBanner(next);
    }, []);

    const showBanner = useCallback((notification: AppNotification) => {
        if (isDuplicate(notification.id)) return;

        // Add to history
        setNotifications(prev => [notification, ...prev.slice(0, 49)]);
        setUnreadCount(c => c + 1);

        // Haptics based on priority
        if (notification.type === 'ALERT') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else if (notification.type === 'ORDER') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Play custom notification sound
        const playNotificationSound = async () => {
            try {
                const { sound } = await Audio.Sound.createAsync(
                    require('../assets/sounds/notify.ogg')
                );
                await sound.playAsync();
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        sound.unloadAsync();
                    }
                });
            } catch (err) {
                console.log('[NotificationContext] Sound error:', err);
            }
        };
        playNotificationSound();

        // Queue banner
        bannerQueue.current.push(notification);
        if (!isBannerShowing.current) {
            processQueue();
        }
    }, [processQueue]);

    // Setup global notification handler (for push notifications received while app open)
    useEffect(() => {
        if (isExpoGo) return;

        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: false, // Custom banner handles this to avoid duplicates
                shouldPlaySound: false, // We play sound manually via expo-av
                shouldSetBadge: true,
                shouldShowBanner: false,
                shouldShowList: true,
            }),
        });

        // Listen for push notifications received in foreground
        const sub = Notifications.addNotificationReceivedListener((notification) => {
            const { title, body, data } = notification.request.content;
            if (title && body) {
                showBanner({
                    id: notification.request.identifier,
                    title: title as string,
                    body: body as string,
                    type: (data?.type as NotificationType) || 'ALERT',
                    data: data as Record<string, any>,
                    createdAt: new Date(),
                });
            }
        });
        return () => sub.remove();
    }, [showBanner]);


    const clearAll = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    const markRead = useCallback(() => {
        setUnreadCount(0);
    }, []);

    return (
        <NotificationContext.Provider value={{ unreadCount, notifications, showBanner, clearAll, markRead }}>
            {children}
            <NotificationBanner
                notification={currentBanner}
                onDismiss={processQueue}
            />
        </NotificationContext.Provider>
    );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────
export const useNotification = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
    return ctx;
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        borderRadius: 20,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
        // Strong Drop shadow for maximum visibility
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 25,
        elevation: 25,
    },
    bannerIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerTextWrap: {
        flex: 1,
    },
    bannerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    bannerBody: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
    bannerClose: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
});
