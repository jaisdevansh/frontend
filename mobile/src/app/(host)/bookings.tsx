import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, RefreshControl, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/design-system';
import { hostService } from '../../services/hostService';
import { useToast } from '../../context/ToastContext';
import { useEvents } from '../../hooks/useEvents';
import SafeFlashList from '../../components/SafeFlashList';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── GET AVATAR COLOR BASED ON NAME
const getAvatarColor = (name: string) => {
    const colors = ['#818CF8', '#F59E0B', '#10B981', '#EC4899', '#06B6D4', '#8B5CF6'];
    const index = name.length % colors.length;
    return colors[index];
};

// 🚀 MEMOIZED BOOKING CARD FOR MAXIMUM FPS 🚀
const BookingCard = React.memo(({ booking, getStatusColor, handleUpdateStatus }: any) => {
    const guestName = booking.userId?.name || 'Unknown Guest';
    const initial = guestName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(guestName);

    return (
        <View style={styles.bookingItem}>
            <View style={styles.bookingDetailsRow}>
                <View style={[styles.avatar, { backgroundColor: avatarColor + '25', borderColor: avatarColor + '40' }]}>
                    <Text style={[styles.avatarText, { color: avatarColor }]}>{initial}</Text>
                </View>
                
                <View style={styles.guestInfo}>
                    <Text style={styles.guestName}>{guestName}</Text>
                    <View style={styles.guestMetaRow}>
                        <Ionicons name="people" size={12} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.bookingType}>
                            {booking.guests || booking.guestsCount || 1} Guests
                        </Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.codeText}>
                            Code: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{booking.bookingCode?.toUpperCase() || booking._id?.substring(0,6).toUpperCase()}</Text>
                        </Text>
                    </View>
                </View>
                
                <View style={[styles.statusBox, { backgroundColor: `${getStatusColor(booking.status)}15`, borderColor: `${getStatusColor(booking.status)}30` }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {(booking.status || 'Confirmed').toUpperCase().replace('_', ' ')}
                    </Text>
                </View>
            </View>

            {booking.status === 'pending' && (
                <View style={styles.hostActionsRow}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]} 
                        onPress={() => handleUpdateStatus(booking._id, 'approved')}
                    >
                        <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.emerald} />
                        <Text style={[styles.actionTxt, { color: COLORS.emerald }]}>Approve</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]} 
                        onPress={() => handleUpdateStatus(booking._id, 'rejected')}
                    >
                        <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                        <Text style={[styles.actionTxt, { color: '#EF4444' }]}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}, (prev, next) => prev.booking._id === next.booking._id && prev.booking.status === next.booking.status);


const EventGroupCard = React.memo(({ group, getStatusColor, handleUpdateStatus }: any) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    const gradientColors = group.eventId === 'unknown' 
        ? ['#1F2937', '#111827'] as [string, string]
        : ['#312E81', '#1E1B4B'] as [string, string];

    return (
        <View style={styles.groupCard}>
            <TouchableOpacity 
                style={styles.groupHeader} 
                onPress={toggleExpand}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={gradientColors}
                    style={[StyleSheet.absoluteFillObject, { opacity: 0.4 }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
                
                <View style={{ marginRight: 14 }}>
                    {group.image ? (
                        <Image source={{ uri: group.image }} style={styles.groupEventImage} contentFit="cover" />
                    ) : (
                        <View style={[styles.groupEventImage, styles.groupEventImagePlaceholder]}>
                            <Ionicons name="images-outline" size={20} color="rgba(255,255,255,0.4)" />
                        </View>
                    )}
                </View>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.groupTitle} numberOfLines={1}>{group.title}</Text>
                    <Text style={styles.groupDate}>{group.date ? new Date(group.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}) : 'Ongoing'}</Text>
                    <Text style={styles.groupSubtitle}>
                        Manage <Text style={{ color: '#818CF8', fontWeight: '800' }}>{group.bookings.length} reservations</Text>
                    </Text>
                </View>
                
                <View style={styles.totalBadge}>
                    <Ionicons name="people" size={14} color="#10B981" />
                    <Text style={styles.totalBadgeText}>{group.totalUsers}</Text>
                </View>
                
                <View style={styles.chevronBox}>
                    <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="rgba(255,255,255,0.7)" />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.groupBody}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.02)', 'transparent']}
                        style={StyleSheet.absoluteFillObject}
                    />
                    {group.bookings.map((booking: any) => (
                        <BookingCard 
                            key={booking._id} 
                            booking={booking} 
                            getStatusColor={getStatusColor} 
                            handleUpdateStatus={handleUpdateStatus} 
                        />
                    ))}
                </View>
            )}
        </View>
    );
}, (prev, next) => prev.group.eventId === next.group.eventId && prev.group.bookings.length === next.group.bookings.length);


export default function HostBookings() {
    const goBack = useStrictBack('/(host)/dashboard');
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const { data: eventsData } = useEvents();

    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBookings = async () => {
        try {
            const res = await hostService.getBookings();
            if (res.success) {
                setBookings(res.data || []);
            }
        } catch (error) {
            showToast('Failed to load bookings', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const getStatusColor = useCallback((status: string) => {
        switch (status?.toLowerCase()) {
            case 'checked_in': return COLORS.emerald;
            case 'cancelled':  return '#EF4444';
            case 'rejected':   return '#EF4444';
            case 'approved':   return '#3B82F6';
            case 'pending':    return '#F59E0B';
            default:           return '#818CF8';
        }
    }, []);

    const handleUpdateStatus = useCallback(async (bookingId: string, newStatus: string) => {
        try {
            // Optimistic update
            setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
            showToast(`Booking ${newStatus}`, 'success');
        } catch {
            showToast('Failed to update status', 'error');
            fetchBookings();
        }
    }, [showToast]);

    // Group bookings by event
    const groupedBookings = useMemo(() => {
        const groups: Record<string, any> = {};

        bookings.forEach(b => {
            const evId = b.eventId?._id || b.eventId || 'unknown';
            
            // Try to extract image from the booking payload directly
            let evImage = b.eventId?.coverImage || b.eventId?.image || b.eventId?.imageUrl;
            
            // If not available, cross-reference with the master events list which has full data
            if (!evImage && eventsData) {
                const matchedEvent = eventsData.find((e: any) => e._id === evId || e.id === evId);
                if (matchedEvent) {
                    evImage = matchedEvent.coverImage || matchedEvent.image || matchedEvent.imageUrl;
                }
            }

            if (!groups[evId]) {
                groups[evId] = {
                    eventId: evId,
                    title: b.eventId?.title || 'General / Unknown Event',
                    image: evImage,
                    date: b.eventId?.date,
                    totalUsers: 0,
                    bookings: []
                };
            }
            groups[evId].totalUsers += (b.guests || b.guestsCount || 1);
            groups[evId].bookings.push(b);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.eventId === 'unknown') return 1;
            if (b.eventId === 'unknown') return -1;
            return a.title.localeCompare(b.title);
        });
    }, [bookings, eventsData]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()} activeOpacity={0.7}>
                    <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                    <Ionicons name="chevron-back" size={20} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Event Bookings</Text>
                    <Text style={styles.headerSub}>
                        {loading ? 'Crunching numbers...' : `${groupedBookings.length} Active Events`}
                    </Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#818CF8" />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <SafeFlashList
                        data={groupedBookings}
                        keyExtractor={(item: any) => item.eventId}
                        estimatedItemSize={200}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818CF8" />}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconBox}>
                                    <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.2)" />
                                </View>
                                <Text style={styles.emptyTitle}>No Events Yet</Text>
                                <Text style={styles.emptyDesc}>When users book your events, they will automatically appear categorized here.</Text>
                            </View>
                        }
                        renderItem={({ item }: { item: any }) => (
                            <EventGroupCard 
                                group={item} 
                                getStatusColor={getStatusColor} 
                                handleUpdateStatus={handleUpdateStatus} 
                            />
                        )}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600', marginTop: 2 },
    
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 60,
        paddingTop: 10,
    },

    // EVENT GROUP CARD
    groupCard: {
        backgroundColor: '#090A0C',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 16,
        overflow: 'hidden',
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#0C0D12',
    },
    groupTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    groupDate: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    groupSubtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    groupEventImage: {
        width: 56,
        height: 56,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    groupEventImagePlaceholder: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    totalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        marginRight: 10,
    },
    totalBadgeText: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '900',
    },
    chevronBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupBody: {
        paddingTop: 8,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.03)',
    },

    // INNER BOOKING CARD
    bookingItem: {
        flexDirection: 'column',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    },
    bookingDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '900',
    },
    guestInfo: {
        flex: 1,
    },
    guestName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    guestMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    bookingType: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        fontWeight: '600',
    },
    metaDot: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 12,
        fontWeight: '800',
    },
    codeText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    statusDot: {
        width: 6, height: 6, borderRadius: 3,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    hostActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 12,
        marginTop: 16,
        paddingTop: 0,
        marginLeft: 58, // Align with text
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionTxt: {
        fontSize: 12,
        fontWeight: '800',
    },

    // EMPTY STATE
    emptyState: {
        paddingTop: 80,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
    emptyDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
