import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Dimensions, ActivityIndicator, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/design-system';
import * as Haptics from 'expo-haptics';
import { userService } from '../../services/userService';
import { useStrictBack } from '../../hooks/useStrictBack';
import { useEventTicketsQuery, useEventBasicQuery, usePrefetchEvent } from '../../hooks/useEventQuery';
import { thumb } from '../../services/cloudinaryService';


const { width } = Dimensions.get('window');

const TABLES: any[] = [];

function generateTimeSlots(startTime: string, endTime: string) {
    if (!startTime || !endTime) return ['10:00 PM', '11:00 PM', '12:30 AM', '01:30 AM'];
    
    try {
        const slots = [];
        
        // Convert 12-hour format (08:16 PM) to 24-hour format (20:16)
        const convert12to24 = (time12h: string) => {
            const [time, modifier] = time12h.trim().split(' ');
            let [hours, minutes] = time.split(':');
            
            if (hours === '12') {
                hours = modifier === 'AM' ? '00' : '12';
            } else {
                hours = modifier === 'PM' ? String(parseInt(hours, 10) + 12) : hours.padStart(2, '0');
            }
            
            return `${hours}:${minutes || '00'}`;
        };
        
        const start24 = convert12to24(startTime);
        const end24 = convert12to24(endTime);
        
        const start = new Date(`2000-01-01T${start24}:00`);
        const end = new Date(`2000-01-01T${end24}:00`);
        
        // If end time is before start time, it means it goes to next day
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }
        
        let current = new Date(start);
        
        // Generate slots every 1 hour
        while (current <= end) {
            const hours = current.getHours();
            const minutes = current.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = minutes.toString().padStart(2, '0');
            
            slots.push(`${displayHours}:${displayMinutes} ${ampm}`);
            
            // Add 1 hour (60 minutes)
            current.setMinutes(current.getMinutes() + 60);
        }
        
        return slots.length > 0 ? slots : ['10:00 PM', '11:00 PM', '12:30 AM', '01:30 AM'];
    } catch (error) {
        return ['10:00 PM', '11:00 PM', '12:30 AM', '01:30 AM'];
    }
}

function getNext5Days() {
    const days = [];
    const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        days.push({ day: dayNames[d.getDay()], date: d.getDate(), month: monthNames[d.getMonth()], full: d });
    }
    return days;
}

const TableSelection = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const eventId    = params.eventId    ? String(params.eventId)    : '';
    const eventTitle = params.title      ? String(params.title)      : 'Exclusive Event';
    const venueName  = params.venueName  ? String(params.venueName)  : '';
    const coverImage = params.coverImage ? String(params.coverImage) : '';
    const hostId     = params.hostId     ? String(params.hostId)     : '';

    const { data: eventBasic } = useEventBasicQuery(eventId);

    const days = React.useMemo(() => {
        if (!eventBasic?.date) return getNext5Days();
        const d = new Date(eventBasic.date);
        const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return [{ day: dayNames[d.getDay()], date: d.getDate(), month: monthNames[d.getMonth()], full: d }];
    }, [eventBasic?.date]);
    
    const timeSlots = React.useMemo(() => {
        const slots = generateTimeSlots(eventBasic?.startTime || '', eventBasic?.endTime || '');
        return slots;
    }, [eventBasic?.startTime, eventBasic?.endTime]);
    
    const [guests, setGuests] = useState(2);
    const [selectedDay, setSelectedDay] = useState(0);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState('');
    const [dynamicTables, setDynamicTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const goBack = useStrictBack('/(user)/event-details');

    const [isProceeding, setIsProceeding] = useState(false);

    const { data: eventData } = useEventTicketsQuery(eventId);
    const prefetch = usePrefetchEvent();

    // 🚀 High-Speed Strategy: Prefetch floor plan so the transition is zero-latency
    useEffect(() => {
        if (eventId) {
            prefetch(eventId, coverImage);
        }
    }, [eventId, coverImage]);

    // Ticket data drives the UI — loading resolves after interactions settle


    useEffect(() => {
        if (!eventData) {
            if (eventData === null || eventData === undefined) {
                // If query is done but no data, don't stay stuck
                setLoading(false);
            }
            return;
        }

        const items = Array.isArray(eventData) ? eventData : ((eventData.floors?.length > 0) ? eventData.floors : (eventData.tickets || []));
        
        if (items && items.length > 0) {
            const mapped = items.map((t: any) => {
                const lowName = (t.name || t.type || '').toLowerCase();
                const isVip = lowName.includes('vip') || lowName.includes('diamond');
                const isLounge = lowName.includes('lounge') || lowName.includes('booth') || lowName.includes('private');
                const booked = t.bookedCount || t.sold || 0;
                const capacity = t.capacity || 0;
                
                return {
                    id: t._id || t.type,
                    icon: t.icon || (isVip ? 'diamond' : isLounge ? 'cafe' : 'apps'),
                    label: t.name || t.type,
                    sub: t.description || (isVip ? 'Premium front access' : isLounge ? 'Elevated privacy' : 'Standard event access'),
                    price: t.price,
                    color: t.color || (isVip ? '#7c4dff' : isLounge ? '#3b82f6' : '#10b981'),
                    premium: isVip,
                    unavailable: booked >= capacity,
                    isAlmostFull: (capacity - booked) > 0 && (capacity - booked) <= capacity * 0.1,
                    capacity,
                    booked
                };
            });
            setDynamicTables(mapped);
            if (mapped.length > 0) {
                setSelectedTable(prev => {
                    if (prev && mapped.find((m: any) => m.id === prev)) return prev;
                    const firstAvail = mapped.find((m: any) => !m.unavailable);
                    return firstAvail ? firstAvail.id : (mapped[0]?.id || null);
                });
            }
        }
        setLoading(false);
    }, [eventData]);
    
    // Set default time slot when timeSlots are generated
    useEffect(() => {
        if (timeSlots.length > 0 && !selectedTime) {
            setSelectedTime(timeSlots[0]);
        }
    }, [timeSlots]);

    const table = dynamicTables.find(t => t.id === selectedTable) || dynamicTables[0];

    const handleProceed = () => {
        if (!table || table.unavailable) return;
        setIsProceeding(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Use minimum timeout for ripple effect, then route immediately
        setTimeout(() => {
            router.push({
                pathname: '/(user)/floor-plan',
                params: {
                    eventId,
                    hostId,
                    title: eventTitle,
                    venueName,
                    coverImage,
                    guests: String(guests),
                    zone: table.label || table.id,
                    timeSlot: selectedTime,
                },
            });
            setTimeout(() => setIsProceeding(false), 500);
        }, 50);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#030303" translucent />

            {/* HEADER */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goBack(); }} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Table Selection</Text>
                    <Text style={styles.headerStep}>STEP 1 OF 2</Text>
                </View>
                <View style={styles.stepCircle}>
                    <Text style={styles.stepCircleText}>1</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }} showsVerticalScrollIndicator={false}>

                {/* MEMBERS OFFER CARD */}
                <View style={styles.offerCard}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.offerBadge}>
                            <Text style={styles.offerBadgeText}>MEMBERS-ONLY OFFER APPLIES</Text>
                        </View>
                        <Text style={styles.offerTitle}>{eventTitle.length > 20 ? eventTitle.substring(0, 20) + '...' : eventTitle}</Text>
                        <Text style={styles.offerDesc}>Exclusive 20% credit on premium bottles for tonight's booking.</Text>
                        <TouchableOpacity style={styles.offerLink} onPress={() => router.push({ pathname: '/(user)/event-details', params: { eventId } })}>
                            <Text style={styles.offerLinkText}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                    {coverImage ? (
                        <Image 
                            source={{ uri: thumb(coverImage) }} 
                            style={[styles.offerImg, { borderRadius: 12 }]} 
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View style={[styles.offerImg, { backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="musical-notes" size={28} color={COLORS.primary} />
                        </View>
                    )}
                </View>

                <View style={{ paddingHorizontal: 20 }}>
                    {loading ? (
                        <View style={{ gap: 16 }}>
                            <View style={{ width: 120, height: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 10 }} />
                            <View style={styles.guestsRow}>
                                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                                <View style={{ width: 40, height: 32, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                            </View>
                            <View style={{ width: 100, height: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginTop: 10 }} />
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ width: 70, height: 80, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                                <View style={{ width: 70, height: 80, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                                <View style={{ width: 70, height: 80, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
                                {[1,2,3,4].map(key => (
                                    <View key={key} style={{ width: (width - 52) / 2, height: 160, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18 }} />
                                ))}
                            </View>
                        </View>
                    ) : (
                        <>
                            {/* GUESTS */}
                            <Text style={styles.sLabel}>How many guests?</Text>
                    <View style={styles.guestsRow}>
                        <TouchableOpacity style={styles.guestBtn} onPress={() => { Haptics.selectionAsync(); setGuests(Math.max(1, guests - 1)); }}>
                            <Text style={styles.guestBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.guestCount}>{guests}</Text>
                        <TouchableOpacity style={[styles.guestBtn, styles.guestBtnPlus]} onPress={() => { Haptics.selectionAsync(); setGuests(Math.min(20, guests + 1)); }}>
                            <Text style={styles.guestBtnTextPlus}>+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* DATE */}
                    <Text style={styles.sLabel}>Select Date</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 28 }}>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {days.map((d, i) => (
                                <TouchableOpacity key={i} style={[styles.dateChip, selectedDay === i && styles.dateChipActive]}
                                    onPress={() => { Haptics.selectionAsync(); setSelectedDay(i); }}>
                                    <Text style={[styles.dateChipDay, selectedDay === i && { color: '#fff' }]}>{d.day}</Text>
                                    <Text style={[styles.dateChipDate, selectedDay === i && { color: '#fff', fontWeight: '800' }]}>{d.date}</Text>
                                    <Text style={[styles.dateChipMonth, selectedDay === i && { color: 'rgba(255,255,255,0.7)' }]}>{d.month}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* TABLE GRID */}
                    <View style={styles.tableHeader}>
                        <Text style={styles.sLabel}>Choose your table</Text>
                        <TouchableOpacity onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push({
                                    pathname: '/(user)/floor-plan',
                                    params: {
                                        eventId,
                                        guests: String(guests),
                                        zone: table?.id || 'VIP',
                                        title: eventTitle,
                                        venueName,
                                        coverImage,
                                        hostId,
                                        timeSlot: selectedTime,
                                    }
                                });
                            }}>
                            <Text style={styles.floorLink}>Floor Map →</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.tableGrid}>
                        {dynamicTables.map((t) => {
                            const isSelected = selectedTable === t.id;
                            const isUnavail = t.unavailable;
                            return (
                                <TouchableOpacity key={t.id} style={[styles.tableCard, isSelected && styles.tableCardActive, isUnavail && { opacity: 0.4 }]}
                                    onPress={() => { if (!isUnavail) { Haptics.selectionAsync(); setSelectedTable(t.id); } }}>
                                    <Ionicons name={t.icon as any} size={22} color={isSelected ? t.color : 'rgba(255,255,255,0.4)'} />
                                    <Text style={[styles.tableCardLabel, isSelected && { color: '#fff' }]}>{t.label}</Text>
                                    <Text style={styles.tableCardSub}>{t.sub}</Text>
                                    
                                    <View style={styles.badgeRow}>
                                        {t.isAlmostFull && <View style={styles.smallBadgeFull}><Text style={styles.smallBadgeText}>ALMOST FULL</Text></View>}
                                        <View style={styles.smallBadgeAvailability}>
                                            <Text style={styles.smallBadgeText}>{Math.max(0, t.capacity - t.booked)} LEFT</Text>
                                        </View>
                                    </View>

                                    {t.price ? (
                                        <View>
                                            <Text style={[styles.tableCardPrice, { color: isSelected ? t.color : '#fff' }]}>{'\u20b9'}{t.price.toLocaleString()}</Text>
                                            {t.discount && <Text style={styles.tableDiscount}>{t.discount}</Text>}
                                        </View>
                                    ) : (
                                        <Text style={styles.unavailText}>Unavailable</Text>
                                    )}
                                    {isSelected && <View style={[styles.selectedDot, { backgroundColor: t.color }]} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* TIME SLOTS */}
                    <Text style={styles.sLabel}>Time Slot</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {timeSlots.map((t) => (
                            <TouchableOpacity key={t} style={[styles.timeChip, selectedTime === t && styles.timeChipActive]}
                                onPress={() => { Haptics.selectionAsync(); setSelectedTime(t); }}>
                                <Text style={[styles.timeChipText, selectedTime === t && { color: '#fff', fontWeight: '700' }]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* FOOTER */}
            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20 }]}>
                <View style={{ flex: 1 }}>
                    {table?.price && (() => {
                        const base = table.price * guests;
                        const serviceFee = Math.round(base * 0.10);
                        const totalWithFee = base + serviceFee;
                        return (
                            <>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                                    Base: {'\u20b9'}{base.toLocaleString()} + 10% fee
                                </Text>
                                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>
                                    {'\u20b9'}{totalWithFee.toLocaleString()}
                                </Text>
                                <Text style={{ color: '#F59E0B', fontSize: 9, fontWeight: '800', marginTop: 1 }}>
                                    INCL. ₹{serviceFee.toLocaleString()} SERVICE CHARGE
                                </Text>
                            </>
                        );
                    })()}
                </View>
                <TouchableOpacity 
                    style={[styles.proceedBtn, (!table || table.unavailable || isProceeding) && { opacity: 0.5 }]} 
                    onPress={handleProceed}
                    disabled={isProceeding}
                >
                    <LinearGradient colors={['#6d28d9', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.proceedGrad}>
                        {isProceeding ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.proceedText}>Proceed</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
    headerStep: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
    stepCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
    stepCircleText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    offerCard: { flexDirection: 'row', backgroundColor: '#0D0D0D', margin: 20, borderRadius: 20, padding: 18, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 24 },
    offerBadge: { backgroundColor: 'rgba(124,77,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 },
    offerBadgeText: { color: COLORS.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    offerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
    offerDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 17, marginBottom: 10 },
    offerLink: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, alignSelf: 'flex-start' },
    offerLinkText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    offerImg: { width: 90, height: 90, borderRadius: 12 },
    sLabel: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 14 },
    guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 28 },
    guestBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
    guestBtnPlus: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    guestBtnText: { color: '#fff', fontSize: 24, fontWeight: '300', marginTop: -2 },
    guestBtnTextPlus: { color: '#fff', fontSize: 22, fontWeight: '300', marginTop: -2 },
    guestCount: { color: '#fff', fontSize: 32, fontWeight: '300', minWidth: 40, textAlign: 'center' },
    dateChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    dateChipActive: { backgroundColor: '#1a1030', borderColor: COLORS.primary },
    dateChipDay: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    dateChipDate: { color: '#fff', fontSize: 18, fontWeight: '600', marginVertical: 2 },
    dateChipMonth: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '500' },
    tableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    floorLink: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
    tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
    tableCard: { width: (width - 52) / 2, backgroundColor: '#0D0D0D', borderRadius: 18, padding: 16, gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' },
    tableCardActive: { borderColor: 'rgba(124,77,255,0.5)', backgroundColor: '#0e0a1e' },
    tableCardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700', marginTop: 4 },
    tableCardSub: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 4 },
    tableCardPrice: { fontSize: 16, fontWeight: '800' },
    tableDiscount: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
    unavailText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '600' },
    selectedDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4 },
    timeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    timeChipActive: { backgroundColor: '#1a1030', borderColor: COLORS.primary },
    timeChipText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(3,3,3,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    proceedBtn: { borderRadius: 14, overflow: 'hidden' },
    proceedGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14 },
    proceedText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    badgeRow: { flexDirection: 'row', gap: 4, marginTop: 4, marginBottom: 8 },
    smallBadgeFull: { backgroundColor: 'rgba(255, 77, 77, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255, 77, 77, 0.3)' },
    smallBadgeValue: { backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)' },
    smallBadgeAvailability: { backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
    smallBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
});

export default React.memo(TableSelection);