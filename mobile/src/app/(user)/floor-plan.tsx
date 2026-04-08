import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ActivityIndicator, Dimensions, InteractionManager
} from 'react-native';
import SafeFlashList from '../../components/SafeFlashList';

// Safe Alias
const FlashList = SafeFlashList;
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/design-system';
import { userService } from '../../services/userService';
import { useAlert } from '../../context/AlertProvider';
import { useStrictBack } from '../../hooks/useStrictBack';
import { useBookingStore } from '../../store/bookingStore';
import { Seat } from '../../features/booking/components/Seat';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../services/apiClient';

// ─── TYPES ────────────────────────────────────────────────
type SeatStatus = 'available' | 'booked' | 'selected' | 'locked';
interface SeatData {
    id: string;
    number: string;
    zone: string; 
    status: SeatStatus;
    price: number;
}

const NUM_COLUMNS = 6;
const SEAT_TOTAL_SIZE = 56; 

// ─── COMPONENT ────────────────────────────────────────────
export default function FloorPlan() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const { showAlert } = useAlert();
    
    // Params
    const eventId    = params.eventId ? String(params.eventId) : '';
    const guests     = params.guests ? Number(params.guests) : 2;
    const targetZone = params.zone ? String(params.zone) : '';

    // Store Logic
    const { selectedSeats, toggleSeat, clearSelection } = useBookingStore();
    
    // Static Data
    const [seats, setSeats] = useState<SeatData[]>([]);
    const [zonesMetadata, setZonesMetadata] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [locking, setLocking] = useState(false);

    const goBack = useStrictBack('/(user)/ticket-selection');

    // 🚀 Clean Start: Always clear selection when entering a new floor plan session
    useEffect(() => {
        clearSelection();
    }, [eventId]);

    const loadFloor = useCallback(async () => {
        if (!eventId) return;
        setLoading(true);
        try {
            const res = await userService.getFloorPlan(eventId);
            if (res?.success && res.data?.zones?.length > 0) {
                setZonesMetadata(res.data.zones);
                
                // Flexible Match: Try param zone, then first zone
                const zoneData = res.data.zones.find((z: any) => 
                    z.name?.toLowerCase() === targetZone.toLowerCase() || 
                    targetZone.toLowerCase().includes(z.name?.toLowerCase())
                ) || res.data.zones[0];

                if (zoneData && zoneData.seats) {
                    const mappedSeats = zoneData.seats.map((s: any) => ({
                        id: s.id || s._id,
                        number: s.number,
                        zone: zoneData.name,
                        status: s.status || 'available',
                        price: s.price || zoneData.price || 0
                    }));
                    setSeats(mappedSeats);
                }
            } else {
                setSeats([]);
            }
        } catch (err) {
            console.error('Floor Plan Load Error:', err);
        } finally {
            setLoading(false);
        }
    }, [eventId, targetZone]);

    useEffect(() => { loadFloor(); }, [loadFloor]);

    useEffect(() => {
        const socket = io(API_BASE_URL);
        socket.on('inventory_update', (data: any) => {
            if (data.eventId === eventId) loadFloor();
        });
        return () => { socket.disconnect(); };
    }, [eventId, loadFloor]);

    const renderSeat = useCallback(({ item }: { item: SeatData }) => (
        <Seat
            id={item.id}
            isSelected={selectedSeats.has(item.id)}
            isBooked={item.status === 'booked'}
            color={zonesMetadata.find(z => z.name === targetZone)?.color || COLORS.primary}
            onPress={(id) => toggleSeat(id, guests)}
        />
    ), [selectedSeats, zonesMetadata, targetZone, toggleSeat, guests]);

    const handleProceed = () => {
        if (selectedSeats.size !== guests) {
            showAlert('Wait', `Please select exactly ${guests} seats.`);
            return;
        }

        const selectedIds = Array.from(selectedSeats);
        const totalCost = (seats[0]?.price || activeZoneMeta?.price || 0) * guests;

        // INSTANT NAVIGATION
        router.replace({
            pathname: '/(user)/payment',
            params: {
                ...params,
                seatIds: selectedIds.join(','),
                total: totalCost,
                lockId: `lock_${Date.now()}`
            }
        });

        InteractionManager.runAfterInteractions(() => {
            setLocking(true);
            userService.lockSeats({
                eventId, seatIds: selectedIds, guestCount: guests, zone: targetZone
            }).catch(() => {
                showAlert('Wait', 'Some seats are no longer available.');
                loadFloor();
            }).finally(() => {
                setLocking(false);
            });
        });
    };

    const activeZoneMeta = useMemo(() => 
        zonesMetadata.find(z => z.name === targetZone), 
    [zonesMetadata, targetZone]);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.loaderTxt}>Initializing Venue...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />
            
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Select Your Table</Text>
                    <Text style={[styles.headerSub, { color: activeZoneMeta?.color || '#fff' }]}>
                        {targetZone} Zone • {guests} Guests
                    </Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{selectedSeats.size}/{guests}</Text>
                </View>
            </View>

            <FlashList
                data={seats}
                extraData={selectedSeats}
                renderItem={renderSeat}
                keyExtractor={(item: any) => item.id}
                numColumns={NUM_COLUMNS}
                estimatedItemSize={SEAT_TOTAL_SIZE}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={() => (
                    <>
                        <View style={styles.stage}>
                            <Ionicons name="musical-notes" size={14} color={COLORS.primary} />
                            <Text style={styles.stageText}>DJ • STAGE</Text>
                        </View>
                        <View style={[styles.zoneLabel, { borderColor: (activeZoneMeta?.color || '#fff') + '80' }]}>
                            <View style={[styles.zoneDot, { backgroundColor: activeZoneMeta?.color || '#fff' }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.zoneLabelTxt, { color: activeZoneMeta?.color || '#fff' }]}>{targetZone} Zone</Text>
                                <Text style={styles.zonePriceLabel}>Selected Range • ₹{activeZoneMeta?.price || seats?.[0]?.price || 0}</Text>
                            </View>
                            <Text style={styles.zoneStats}>{activeZoneMeta?.available} / {activeZoneMeta?.total} left</Text>
                        </View>
                    </>
                )}
                ListEmptyComponent={() => (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Ionicons name="map-outline" size={48} color="rgba(255,255,255,0.1)" />
                        <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, textAlign: 'center' }}>
                            Floor map for this zone isn't available yet.{"\n"}You can proceed directly to fix your spot.
                        </Text>
                    </View>
                )}
                ListFooterComponent={() => (
                    seats.length > 0 ? (
                        <View style={styles.legend}>
                            <View style={styles.legendItem}><View style={[styles.lDot, { backgroundColor: '#111' }]} /><Text style={styles.lText}>Booked</Text></View>
                            <View style={styles.legendItem}><View style={[styles.lDot, { backgroundColor: '#222', borderWidth: 1, borderColor: '#444' }]} /><Text style={styles.lText}>Available</Text></View>
                            <View style={styles.legendItem}><View style={[styles.lDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.lText}>Selected</Text></View>
                        </View>
                    ) : null
                )}
            />

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.footLbl}>{selectedSeats.size} seated</Text>
                    <Text style={styles.footPrice}>
                        ₹{((activeZoneMeta?.price || seats?.[0]?.price || 0) * guests).toLocaleString()}
                    </Text>
                </View>
                <TouchableOpacity 
                    style={[styles.reserveBtn, (seats.length > 0 && selectedSeats.size !== guests) && { opacity: 0.4 }]}
                    onPress={handleProceed}
                    disabled={locking || (seats.length > 0 && selectedSeats.size !== guests)}
                >
                    <LinearGradient
                        colors={[COLORS.primary, '#4f46e5']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.grad}
                    >
                        {locking ? <ActivityIndicator size="small" color="#fff" /> : (
                            <>
                                <Text style={styles.reserveTxt}>
                                    {seats.length > 0 ? 'Complete Booking' : 'Proceed to Pay'}
                                </Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    loaderContainer: { flex: 1, backgroundColor: '#030303', alignItems: 'center', justifyContent: 'center' },
    loaderTxt: { color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 13, letterSpacing: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#111' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
    headerSub: { fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
    countBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
    countText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    listContent: { paddingHorizontal: 15, paddingBottom: 160 },
    stage: { marginVertical: 24, height: 44, backgroundColor: '#0D0D0D', borderRadius: 12, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    stageText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 4 },
    zoneLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1 },
    zoneDot: { width: 8, height: 8, borderRadius: 4 },
    zoneLabelTxt: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
    zonePriceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 1 },
    zoneStats: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700' },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 40 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    lDot: { width: 12, height: 12, borderRadius: 4 },
    lText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(3,3,3,0.98)', borderTopWidth: 1, borderTopColor: '#111', flexDirection: 'row', alignItems: 'center' },
    footLbl: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
    footPrice: { color: '#fff', fontSize: 20, fontWeight: '900' },
    reserveBtn: { borderRadius: 16, overflow: 'hidden' },
    grad: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 16 },
    reserveTxt: { color: '#fff', fontSize: 15, fontWeight: '900' }
});