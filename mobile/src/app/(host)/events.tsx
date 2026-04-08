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

// Optimization: Event Card Component
const EventCardList = React.memo(({ event, handleDeleteEvent, handleForceReveal, handleEventOptions, formatDate, calculateTotalRevenue, calculateFillPercentage, getTotalSold }: any) => {
    const { day, month } = formatDate(event.date);
    return (
        <TouchableOpacity
            style={styles.eventCard}
            onLongPress={() => handleDeleteEvent(event._id, event.title)}
            delayLongPress={500}
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
                    <View>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventDetails}>{event.startTime || '11:00 PM'} • {(event.status || 'Active').toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleEventOptions(event)}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statVal}>{getTotalSold(event.tickets || [])}</Text>
                        <Text style={styles.statLab}>Booked</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statVal}>{calculateTotalRevenue(event.tickets || [])}</Text>
                        <Text style={styles.statLab}>Revenue</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statVal}>{calculateFillPercentage(event.tickets || [])}</Text>
                        <Text style={styles.statLab}>Full</Text>
                    </View>
                </View>

                {event.locationVisibility !== 'public' && !event.isLocationRevealed && (
                    <TouchableOpacity 
                        style={styles.revealBtn}
                        onPress={() => handleForceReveal(event._id, event.title)}
                    >
                        <Ionicons name="location" size={16} color="#FFF" />
                        <Text style={styles.revealBtnText}>Reveal Location Now</Text>
                    </TouchableOpacity>
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

    const handleEventOptions = useCallback((event: any) => {
        showAlert(
            event.title,
            "Manage your experience",
            [
                {
                    text: "Update Experience",
                    onPress: () => router.push({ pathname: '/(host)/create-event', params: { id: event._id } })
                },
                ...( (event.locationVisibility !== 'public' && !event.isLocationRevealed) ? [{
                    text: "Force Reveal Location 📍",
                    onPress: () => handleForceReveal(event._id, event.title)
                }] : []),
                {
                    text: "Cancel Experience",
                    style: "destructive",
                    onPress: () => handleDeleteEvent(event._id, event.title)
                },
                { text: "Close", style: "cancel" }
            ]
        );
    }, [router, showAlert, handleForceReveal, handleDeleteEvent]);

    const formatDate = useCallback((dateStr: string) => {
        if (!dateStr) return { day: '25', month: 'MAR' };
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        return { day, month };
    }, []);

    const calculateTotalRevenue = useCallback((tickets: any[]) => {
        if (!tickets) return '0';
        const total = tickets.reduce((sum, t) => sum + ((t.sold || 0) * (t.price || 0)), 0);
        if (total >= 100000) return `₹${(total / 100000).toFixed(1)}L`;
        if (total >= 1000) return `₹${(total / 1000).toFixed(1)}K`;
        return `₹${total}`;
    }, []);

    const calculateFillPercentage = useCallback((tickets: any[]) => {
        if (!tickets) return '0%';
        const totalCapacity = tickets.reduce((sum, t) => sum + (t.capacity || 0), 0);
        const totalSold = tickets.reduce((sum, t) => sum + (t.sold || 0), 0);
        if (totalCapacity === 0) return '0%';
        return `${Math.round((totalSold / totalCapacity) * 100)}%`;
    }, []);

    const getTotalSold = useCallback((tickets: any[]) => {
        if (!tickets) return 0;
        return tickets.reduce((sum, t) => sum + (t.sold || 0), 0);
    }, []);

    const renderItem = useCallback(({ item }: any) => (
        <EventCardList
            event={item}
            handleDeleteEvent={handleDeleteEvent}
            handleForceReveal={handleForceReveal}
            handleEventOptions={handleEventOptions}
            formatDate={formatDate}
            calculateTotalRevenue={calculateTotalRevenue}
            calculateFillPercentage={calculateFillPercentage}
            getTotalSold={getTotalSold}
        />
    ), [handleDeleteEvent, handleForceReveal, handleEventOptions, formatDate, calculateTotalRevenue, calculateFillPercentage, getTotalSold]);

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
    revealBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(124, 77, 255, 0.2)',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.3)',
    },
    revealBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
