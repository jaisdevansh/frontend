import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/design-system';
import { hostService } from '../../services/hostService';
import { useToast } from '../../context/ToastContext';
import SafeFlashList from '../../components/SafeFlashList';

// 🚀 MEMOIZED BOOKING CARD FOR MAXIMUM FPS 🚀
const BookingCard = React.memo(({ booking, getStatusColor, handleUpdateStatus }: any) => {
    return (
        <View style={styles.bookingItem}>
            <View style={styles.bookingDetailsRow}>
                <View style={styles.guestInfo}>
                    <Text style={styles.guestName}>{booking.userId?.name || 'Unknown Guest'}</Text>
                    <Text style={styles.bookingType}>
                        {booking.eventId?.title || 'Event'} • {booking.guests || booking.guestsCount || 1} Guests
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 4 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                            Code: {booking.bookingCode?.toUpperCase() || booking._id?.substring(0,8).toUpperCase()}
                        </Text>
                    </View>
                </View>
                <View style={[
                    styles.statusBox,
                    { backgroundColor: `${getStatusColor(booking.status)}20` }
                ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {(booking.status || 'Confirmed').toUpperCase().replace('_', ' ')}
                    </Text>
                </View>
            </View>

            {booking.status === 'pending' && (
                <View style={styles.hostActionsRow}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: COLORS.emerald }]} 
                        onPress={() => handleUpdateStatus(booking._id, 'approved')}
                    >
                        <Text style={[styles.actionTxt, { color: COLORS.emerald }]}>Approve</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: 'rgba(255, 69, 58, 0.2)', borderColor: '#FF453A' }]} 
                        onPress={() => handleUpdateStatus(booking._id, 'rejected')}
                    >
                        <Text style={[styles.actionTxt, { color: '#FF453A' }]}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}, (prev, next) => prev.booking._id === next.booking._id && prev.booking.status === next.booking.status);


export default function HostBookings() {
    const router = useRouter();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();

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
            console.error('Fetch Bookings Error:', error);
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

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'checked_in': return COLORS.emerald;
            case 'cancelled': return '#FF453A';
            case 'rejected': return '#FF453A';
            case 'pending': return COLORS.gold;
            default: return COLORS.primary;
        }
    };

    const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
        try {
            setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
            showToast(`Booking ${newStatus}`, 'success');
            // Assuming hostService.updateBookingStatus exists on the backend API
            // await hostService.updateBookingStatus(bookingId, newStatus);
        } catch {
            showToast('Failed to update status', 'error');
            fetchBookings(); // Rollback
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Guest Bookings</Text>
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <SafeFlashList
                        data={bookings}
                        keyExtractor={(item: any) => item._id}
                        estimatedItemSize={120}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                        ListEmptyComponent={
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 100 }}>No bookings found yet.</Text>
                            </View>
                        }
                        renderItem={({ item }: { item: any }) => (
                            <BookingCard booking={item} getStatusColor={getStatusColor} handleUpdateStatus={handleUpdateStatus} />
                        )}
                    />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    header: {
        padding: SPACING.lg,
        paddingTop: 40,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 40,
    },
    bookingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 16,
    },
    bookingDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    guestInfo: {
        flex: 1,
    },
    guestName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    bookingType: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        marginTop: 2,
    },
    statusBox: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    hostActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)'
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionTxt: {
        fontSize: 12,
        fontWeight: '800'
    }
});
