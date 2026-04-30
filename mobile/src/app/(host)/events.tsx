import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ImageBackground, RefreshControl, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/design-system';
import { Button } from '../../components/Button';
import { hostService } from '../../services/hostService';
import { useToast } from '../../context/ToastContext';
import { useAlert } from '../../context/AlertProvider';
import { useEvents } from '../../hooks/useEvents';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import dayjs from 'dayjs';

const parseTimeString = (timeStr: string, baseDate: dayjs.Dayjs, defaultHour: number) => {
    if (!timeStr) return baseDate.hour(defaultHour).minute(0).second(0);
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const modifier = match[3] ? match[3].toUpperCase() : null;
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return baseDate.hour(hours).minute(minutes).second(0);
    }
    return baseDate.hour(defaultHour).minute(0).second(0);
};

// Helper: derive live status from event date & time
function getEventStatus(event: any): { label: string; color: string; bg: string } {
    const now = dayjs();
    
    // Priority 1: Check for explicit status overrides (DRAFT, PAUSED)
    if (event.status) {
        const status = event.status.toUpperCase();
        if (status === 'PAUSED') return { label: 'PAUSED', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
        if (status === 'DRAFT') return { label: 'DRAFT', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' };
    }

    // Priority 2: Calculate temporal status (UPCOMING, LIVE, ENDED)
    if (event.date) {
        let eventStart: dayjs.Dayjs;
        let eventEnd: dayjs.Dayjs;
        const baseDate = dayjs(event.date);

        if (event.startTime) {
            eventStart = parseTimeString(event.startTime, baseDate, 0);
        } else {
            eventStart = baseDate.startOf('day');
        }

        if (event.endTime) {
            eventEnd = parseTimeString(event.endTime, baseDate, 23);
            if (eventEnd.isBefore(eventStart)) {
                eventEnd = eventEnd.add(1, 'day');
            }
        } else {
            eventEnd = eventStart.add(4, 'hour');
        }

        if (now.isBefore(eventStart)) return { label: 'UPCOMING', color: '#A78BFA', bg: 'rgba(124,77,255,0.15)' };
        if (now.isAfter(eventEnd)) return { label: 'ENDED', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' };
        return { label: 'LIVE NOW', color: '#34D399', bg: 'rgba(52,211,153,0.15)' };
    }

    return { label: 'UPCOMING', color: '#A78BFA', bg: 'rgba(124,77,255,0.15)' };
}

// Optimization: Event Card Component
const EventCardList = React.memo(({ event, handleDeleteEvent, handleForceReveal, handleEventOptions, handlePauseResume, formatDate, calculateTotalRevenue, calculateFillPercentage, getTotalSold }: any) => {
    const { day, month } = formatDate(event.date);
    const status = getEventStatus(event);
    const dbStatus = event.status?.toUpperCase();
    const canPauseResume = dbStatus === 'LIVE' || dbStatus === 'PAUSED';

    return (
        <TouchableOpacity
            style={styles.eventCard}
            onPress={() => handleEventOptions(event)}
            activeOpacity={0.85}
        >
            <View style={styles.cardImage}>
                <Image 
                    source={{ uri: event.coverImage || 'https://images.unsplash.com/photo-1514525253361-bee8a197c0c1?auto=format&fit=crop&q=80&w=800' }}
                    style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 24 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                <View style={[styles.imageOverlay, { borderRadius: 24 }]}>
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateText}>{day}</Text>
                        <Text style={styles.monthText}>{month}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                        <View style={styles.statusRow}>
                            <Text style={styles.eventDetails}>{event.startTime || '—'}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={(e) => { e.stopPropagation?.(); handleEventOptions(event); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statVal}>{getTotalSold(event)}</Text>
                        <Text style={styles.statLab}>Booked</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statVal}>{calculateTotalRevenue(event)}</Text>
                        <Text style={styles.statLab}>Revenue</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statVal}>{calculateFillPercentage(event)}</Text>
                        <Text style={styles.statLab}>Fill</Text>
                    </View>
                </View>

                {/* Quick Action Buttons */}
                <View style={styles.quickActionsRow}>
                    {canPauseResume && (
                        <TouchableOpacity
                            style={[
                                styles.quickActionBtn,
                                dbStatus === 'LIVE'
                                    ? { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.25)' }
                                    : { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.25)' }
                            ]}
                            onPress={(e) => { e.stopPropagation?.(); handlePauseResume(event); }}
                        >
                            <Ionicons
                                name={dbStatus === 'LIVE' ? 'pause-circle-outline' : 'play-circle-outline'}
                                size={15}
                                color={dbStatus === 'LIVE' ? '#F59E0B' : '#34D399'}
                            />
                            <Text style={[
                                styles.quickActionText,
                                { color: dbStatus === 'LIVE' ? '#F59E0B' : '#34D399' }
                            ]}>
                                {dbStatus === 'LIVE' ? 'Pause' : 'Resume'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: 'rgba(129,140,248,0.1)', borderColor: 'rgba(129,140,248,0.2)', flex: canPauseResume ? undefined : 1 }]}
                        onPress={(e) => { e.stopPropagation?.(); handleEventOptions(event); }}
                    >
                        <Ionicons name="settings-outline" size={15} color="#818CF8" />
                        <Text style={[styles.quickActionText, { color: '#818CF8' }]}>Manage</Text>
                    </TouchableOpacity>
                </View>

                {event.locationVisibility !== 'public' && !event.isLocationRevealed && (
                    <View style={styles.revealInfo}>
                        <TouchableOpacity 
                            style={styles.revealBtn}
                            onPress={(e) => { e.stopPropagation?.(); handleForceReveal(event._id, event.title); }}
                        >
                            <Ionicons name="location" size={16} color="#FFF" />
                            <Text style={styles.revealBtnText}>Reveal Now</Text>
                        </TouchableOpacity>
                        {event.revealTime && (
                            <Text style={styles.revealTimeText}>
                                Auto-reveal: {dayjs(event.revealTime).format('MMM DD, hh:mm A')}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

export default function HostEvents() {
    const router = useRouter();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();
    const { showAlert } = useAlert();
    const queryClient = useQueryClient();

    const { data: events, isLoading, refetch, isRefetching } = useEvents();

    const deleteMutation = useMutation({
        mutationFn: (eventId: string) => hostService.deleteEvent(eventId),
        onSuccess: () => {
            showToast('Experience Cancelled', 'success');
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
        onError: (error: any) => {
            showToast(error.response?.data?.message || 'Failed to cancel', 'error');
        }
    });

    const revealMutation = useMutation({
        mutationFn: (eventId: string) => hostService.revealLocation(eventId),
        onSuccess: () => {
            showToast('Location Revealed & Users Notified', 'success');
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
        onError: (error: any) => {
            showToast(error.response?.data?.message || 'Failed to reveal', 'error');
        }
    });

    const pauseResumeMutation = useMutation({
        mutationFn: ({ eventId, status }: { eventId: string; status: 'LIVE' | 'PAUSED' }) =>
            hostService.updateEventStatus(eventId, status),
        onSuccess: (_, vars) => {
            showToast(vars.status === 'PAUSED' ? 'Event Paused ⏸' : 'Event Resumed ▶️', 'success');
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
        onError: (error: any) => {
            showToast(error.response?.data?.message || 'Failed to update event status', 'error');
        }
    });

    const handleDeleteEvent = useCallback((eventId: string, eventTitle: string) => {
        showAlert(
            "Cancel Experience",
            `Are you sure you want to cancel "${eventTitle}"? This action cannot be undone.`,
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel It",
                    style: "destructive",
                    onPress: () => deleteMutation.mutate(eventId)
                }
            ]
        );
    }, [showAlert, deleteMutation]);

    const handleForceReveal = useCallback((eventId: string, eventTitle: string) => {
        showAlert(
            "Reveal Location",
            `Are you sure you want to reveal the secret location for "${eventTitle}" right now? All ticket holders will be notified.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reveal Now 📍",
                    style: "destructive",
                    onPress: () => revealMutation.mutate(eventId)
                }
            ]
        );
    }, [showAlert, revealMutation]);

    const handlePauseResume = useCallback((event: any) => {
        const dbStatus = event.status?.toUpperCase();
        const isPaused = dbStatus === 'PAUSED';
        showAlert(
            isPaused ? 'Resume Event' : 'Pause Event',
            isPaused
                ? `Resume "${event.title}"? It will go live again and accept new bookings.`
                : `Pause "${event.title}"? New bookings will be stopped temporarily.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isPaused ? 'Resume' : 'Pause',
                    onPress: () => pauseResumeMutation.mutate({
                        eventId: event._id,
                        status: isPaused ? 'LIVE' : 'PAUSED'
                    })
                }
            ]
        );
    }, [showAlert, pauseResumeMutation]);

    const handleEventOptions = useCallback((event: any) => {
        const dbStatus = event.status?.toUpperCase();
        const isPaused = dbStatus === 'PAUSED';
        const isLive = dbStatus === 'LIVE';
        showAlert(
            event.title,
            "What would you like to do?",
            [
                {
                    text: "Edit Event",
                    onPress: () => router.push({ pathname: '/(host)/create-event', params: { id: event._id } })
                },
                ...((isLive || isPaused) ? [{
                    text: isPaused ? 'Resume Event' : 'Pause Event',
                    onPress: () => handlePauseResume(event)
                }] : []),
                ...((event.locationVisibility !== 'public' && !event.isLocationRevealed) ? [{
                    text: "Reveal Location Now",
                    onPress: () => handleForceReveal(event._id, event.title)
                }] : []),
                {
                    text: "Cancel & Delete Event",
                    style: "destructive",
                    onPress: () => handleDeleteEvent(event._id, event.title)
                },
                { text: "Close", style: "cancel" }
            ]
        );
    }, [router, showAlert, handleForceReveal, handleDeleteEvent, handlePauseResume]);

    const formatDate = useCallback((dateStr: string) => {
        if (!dateStr) return { day: '25', month: 'MAR' };
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        return { day, month };
    }, []);

    // ── Real stats from backend aggregation (_bookingStats) ──────────────────
    // These read from _bookingStats injected by getEvents controller (real Booking data)
    // Fallback to ticket.sold for older cached responses
    const getTotalSold = useCallback((event: any) => {
        if (event?._bookingStats) return event._bookingStats.totalBooked ?? 0;
        return (event?.tickets || []).reduce((sum: number, t: any) => sum + (t.sold || 0), 0);
    }, []);

    const calculateTotalRevenue = useCallback((event: any) => {
        const total = event?._bookingStats
            ? (event._bookingStats.totalRevenue ?? 0)
            : (event?.tickets || []).reduce((sum: number, t: any) => sum + ((t.sold || 0) * (t.price || 0)), 0);
        if (total >= 100000) return `₹${(total / 100000).toFixed(1)}L`;
        if (total >= 1000) return `₹${(total / 1000).toFixed(1)}K`;
        return `₹${total}`;
    }, []);

    const calculateFillPercentage = useCallback((event: any) => {
        const totalBooked = event?._bookingStats
            ? (event._bookingStats.totalBooked ?? 0)
            : (event?.tickets || []).reduce((sum: number, t: any) => sum + (t.sold || 0), 0);
        // Capacity still comes from ticket definitions (configured max)
        const totalCapacity = (event?.tickets || []).reduce((sum: number, t: any) => sum + (t.capacity || 0), 0)
            || event?.attendeeCount || 0;
        if (totalCapacity === 0) return '0%';
        return `${Math.round((totalBooked / totalCapacity) * 100)}%`;
    }, []);

    const renderItem = useCallback(({ item }: any) => (
        <EventCardList
            event={item}
            handleDeleteEvent={handleDeleteEvent}
            handleForceReveal={handleForceReveal}
            handleEventOptions={handleEventOptions}
            handlePauseResume={handlePauseResume}
            formatDate={formatDate}
            calculateTotalRevenue={calculateTotalRevenue}
            calculateFillPercentage={calculateFillPercentage}
            getTotalSold={getTotalSold}
        />
    ), [handleDeleteEvent, handleForceReveal, handleEventOptions, handlePauseResume, formatDate, calculateTotalRevenue, calculateFillPercentage, getTotalSold]);

    const ListEmptyComponent = useMemo(() => (
        <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyText}>No events launched yet</Text>
            <Button
                title="Create First Event"
                onPress={() => router.push('/(host)/create-event')}
                variant="outline"
                style={{ marginTop: 20 }}
            />
        </View>
    ), [router]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.headerTitle} numberOfLines={1}>Manage Events</Text>
                    <Button
                        title="Create"
                        onPress={() => router.push('/(host)/create-event')}
                        style={styles.createBtn}
                        variant="glass"
                        textStyle={{ fontSize: 12 }}
                    />
                </View>
            </View>

            {isLoading && !isRefetching ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={events || []}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
                    }
                    ListEmptyComponent={ListEmptyComponent}
                    removeClippedSubviews
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={6}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    headerContainer: {
        paddingHorizontal: SPACING.lg,
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
    },
    createBtn: {
        height: 36,
        width: 100,
        paddingHorizontal: 0,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 40,
        flexGrow: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 16,
        marginTop: 16,
    },
    eventCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 20,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: 160,
    },
    imageOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 16,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    dateBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        alignItems: 'center',
        minWidth: 50,
    },
    dateText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    monthText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    cardContent: {
        padding: 16,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    eventTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    eventDetails: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        marginTop: 4,
    },
    editBtn: {
        padding: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    stat: {
        alignItems: 'flex-start',
    },
    statVal: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    statLab: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    quickActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    revealBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(124, 77, 255, 0.2)',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.3)',
        marginRight: 12,
        flex: 1,
    },
    revealBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    revealInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    revealTimeText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '600',
        fontStyle: 'italic',
    },
});
