import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import PremiumToast, { ToastRef } from '../../components/PremiumToast';
import { useRef } from 'react';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#7e51fb',
    backgroundDark: '#0a0a0a',
    cardDark: '#151515',
    glassCardBg: 'rgba(255, 255, 255, 0.03)',
    glassCardBorder: 'rgba(255, 255, 255, 0.08)',
    slate900: '#0f172a',
    slate800: '#1e293b',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate300: '#cbd5e1',
    slate200: '#e2e8f0',
    white: '#ffffff',
    success: '#0bda6c',
    warning: '#fa6c38',
    danger: '#ff6b6b',
    teal: '#00D1B2',
};

export default function AdminVenue() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const toastRef = useRef<ToastRef>(null);
    const [selectedVenue, setSelectedVenue] = React.useState<any>(null);
    const [showAllVenues, setShowAllVenues] = React.useState(false);

    const ALL_VENUES = [
        { name: 'Neon Noir', revenue: '$42.4k', bookings: 156, uri: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=200&q=80' },
        { name: 'Velvet Underground', revenue: '$38.1k', bookings: 122, uri: 'https://images.unsplash.com/photo-1574091678382-3d14d8acca7a?auto=format&fit=crop&w=200&q=80' },
        { name: 'The Marble Arch', revenue: '$29.5k', bookings: 98, uri: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=200&q=80' },
        { name: 'Skyline Terrace', revenue: '$22.8k', bookings: 74, uri: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=200&q=80' },
        { name: 'Prism Club', revenue: '$18.2k', bookings: 62, uri: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=80' },
        { name: 'Aura Lounge', revenue: '$15.5k', bookings: 45, uri: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=200&q=80' },
        { name: 'Elysium Garden', revenue: '$12.9k', bookings: 38, uri: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=200&q=80' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Top Navigation Bar */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerInner}>
                    <View style={styles.headerLeft}>
                        <View style={styles.iconBox}>
                            <MaterialIcons name="analytics" size={24} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>Booking Analytics</Text>
                            <Text style={styles.headerSubtitle}>Luxe Nightlife Admin</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => toastRef.current?.show({ title: "Calendar", message: "Booking calendar is loading...", type: "info" })}>
                            <MaterialIcons name="calendar-today" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => toastRef.current?.show({ title: "Notifications", message: "You have no new notifications.", type: "info" })}>
                            <MaterialIcons name="notifications" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* KPI Carousel */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
                    {/* Revenue KPI */}
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>TOTAL REVENUE</Text>
                        <Text style={styles.kpiValue}>$142,500</Text>
                        <View style={styles.trendRow}>
                            <MaterialIcons name="trending-up" size={16} color={COLORS.teal} />
                            <Text style={styles.trendText}>+12.4%</Text>
                        </View>
                        <View style={styles.sparkline}>
                            <Svg height="30" width="100%">
                                <Path
                                    d="M0 25 Q 25 5, 50 20 T 100 10"
                                    fill="none"
                                    stroke={COLORS.primary}
                                    strokeWidth="2"
                                />
                            </Svg>
                        </View>
                    </View>

                    {/* Bookings KPI */}
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>ACTIVE BOOKINGS</Text>
                        <Text style={styles.kpiValue}>1,240</Text>
                        <View style={styles.trendRow}>
                            <MaterialIcons name="trending-up" size={16} color={COLORS.teal} />
                            <Text style={styles.trendText}>+5.2%</Text>
                        </View>
                        <View style={styles.sparkline}>
                            <Svg height="30" width="100%">
                                <Path
                                    d="M0 20 Q 25 25, 50 10 T 100 15"
                                    fill="none"
                                    stroke={COLORS.primary}
                                    strokeWidth="2"
                                />
                            </Svg>
                        </View>
                    </View>

                    {/* Growth KPI */}
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>USER GROWTH</Text>
                        <Text style={styles.kpiValue}>450</Text>
                        <View style={styles.trendRow}>
                            <MaterialIcons name="trending-up" size={16} color={COLORS.teal} />
                            <Text style={styles.trendText}>+8.1%</Text>
                        </View>
                        <View style={styles.sparkline}>
                            <Svg height="30" width="100%">
                                <Path
                                    d="M0 15 Q 25 10, 50 25 T 100 5"
                                    fill="none"
                                    stroke={COLORS.primary}
                                    strokeWidth="2"
                                />
                            </Svg>
                        </View>
                    </View>
                </ScrollView>

                {/* Main Chart Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Booking Trends</Text>
                                <View style={styles.chartSubHeader}>
                                    <Text style={styles.dateRange}>May 01 - May 31</Text>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>+14% OVERALL</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.legendContainer}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                                    <Text style={styles.legendLabel}>VIP</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: COLORS.teal }]} />
                                    <Text style={styles.legendLabel}>STD</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.chartArea}>
                            <Svg height="200" width="100%">
                                <Defs>
                                    <LinearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.3" />
                                        <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0" />
                                    </LinearGradient>
                                </Defs>
                                {/* Grid lines */}
                                {[0, 40, 80, 120, 160, 200].map((h) => (
                                    <Path key={h} d={`M0 ${h} L${width} ${h}`} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                                ))}
                                {/* Area Fill */}
                                <Path
                                    d="M0 160 Q 50 140, 100 170 T 200 80 T 300 120 T 400 40 V 200 H 0 Z"
                                    fill="url(#violetGradient)"
                                />
                                {/* VIP Line */}
                                <Path
                                    d="M0 160 Q 50 140, 100 170 T 200 80 T 300 120 T 400 40"
                                    fill="none"
                                    stroke={COLORS.primary}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />
                                {/* Standard Line */}
                                <Path
                                    d="M0 180 Q 50 190, 100 150 T 200 140 T 300 160 T 400 90"
                                    fill="none"
                                    stroke={COLORS.teal}
                                    strokeWidth="3"
                                    strokeDasharray="8,4"
                                />
                            </Svg>
                        </View>
                        <View style={styles.chartXLabels}>
                            <Text style={styles.xLabel}>WEEK 1</Text>
                            <Text style={styles.xLabel}>WEEK 2</Text>
                            <Text style={styles.xLabel}>WEEK 3</Text>
                            <Text style={styles.xLabel}>WEEK 4</Text>
                        </View>
                    </View>
                </View>

                {/* Top Performing Venues */}
                <View style={styles.sectionContainer}>
                    <View style={styles.listCard}>
                        <View style={styles.listHeader}>
                            <Text style={styles.sectionTitle}>Top Performing Venues</Text>
                            <TouchableOpacity onPress={() => setShowAllVenues(true)}>
                                <Text style={styles.seeAllText}>VIEW ALL</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.venueList}>
                            {ALL_VENUES.slice(0, 3).map((venue, idx) => (
                                <TouchableOpacity key={idx} style={styles.venueItem} onPress={() => setSelectedVenue(venue)}>
                                    <View style={styles.venueLeft}>
                                        <Image source={{ uri: venue.uri }} style={styles.venueImg} />
                                        <View>
                                            <Text style={styles.venueName}>{venue.name}</Text>
                                            <Text style={styles.venueStats}>{venue.revenue} Revenue • {venue.bookings} Bookings</Text>
                                        </View>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={20} color={COLORS.slate500} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Gender Distribution */}
                <View style={styles.sectionContainer}>
                    <View style={styles.chartCard}>
                        <Text style={styles.sectionTitle}>Gender Distribution</Text>
                        <View style={styles.doughnutContainer}>
                            <Svg height="160" width="160" viewBox="0 0 160 160">
                                <Circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="transparent" />
                                {/* Male: 55% */}
                                <Circle
                                    cx="80" cy="80" r="70"
                                    stroke={COLORS.primary}
                                    strokeWidth="14"
                                    strokeDasharray="241,440"
                                    strokeLinecap="round"
                                    fill="transparent"
                                    transform="rotate(-90 80 80)"
                                />
                                {/* Female: 45% */}
                                <Circle
                                    cx="80" cy="80" r="70"
                                    stroke={COLORS.teal}
                                    strokeWidth="14"
                                    strokeDasharray="197,440"
                                    strokeDashoffset="-241"
                                    strokeLinecap="round"
                                    fill="transparent"
                                    transform="rotate(-90 80 80)"
                                />
                            </Svg>
                            <View style={styles.doughnutHole}>
                                <Text style={styles.holeValue}>1.2k</Text>
                                <Text style={styles.holeLabel}>TOTAL USERS</Text>
                            </View>
                        </View>
                        <View style={styles.distributionLabels}>
                            <View style={styles.distLabel}>
                                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                                <View>
                                    <Text style={styles.distName}>MALE</Text>
                                    <Text style={styles.distValue}>55%</Text>
                                </View>
                            </View>
                            <View style={styles.distLabel}>
                                <View style={[styles.legendDot, { backgroundColor: COLORS.teal }]} />
                                <View>
                                    <Text style={styles.distName}>FEMALE</Text>
                                    <Text style={styles.distValue}>45%</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 24 }]}>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin/dashboard' as any)}>
                    <MaterialIcons name="dashboard" size={24} color={COLORS.slate500} />
                    <Text style={[styles.navText, { color: COLORS.slate500 }]}>DASHBOARD</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin/staff' as any)}>
                    <MaterialIcons name="groups" size={24} color={COLORS.slate500} />
                    <Text style={[styles.navText, { color: COLORS.slate500 }]}>STAFF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin/venue' as any)}>
                    <MaterialIcons name="location-on" size={24} color={COLORS.primary} />
                    <Text style={[styles.navText, { color: COLORS.primary }]}>VENUE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin/settings' as any)}>
                    <MaterialIcons name="settings" size={24} color={COLORS.slate500} />
                    <Text style={[styles.navText, { color: COLORS.slate500 }]}>SETTINGS</Text>
                </TouchableOpacity>
            </View>

            {/* Venue Details Modal */}
            {selectedVenue && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Venue Analytics</Text>
                            <TouchableOpacity onPress={() => setSelectedVenue(null)}>
                                <MaterialIcons name="close" size={24} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.venueProfileHeader}>
                            <Image source={{ uri: selectedVenue.uri }} style={styles.venueProfileImg} />
                            <View>
                                <Text style={styles.venueProfileName}>{selectedVenue.name}</Text>
                                <View style={styles.liveTag}>
                                    <View style={styles.livePulse} />
                                    <Text style={styles.liveTagText}>LIVE PERFORMANCE</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.venueDetailedStats}>
                            <View style={styles.vStatItem}>
                                <Text style={styles.vStatLabel}>REVENUE</Text>
                                <Text style={styles.vStatValue}>{selectedVenue.revenue}</Text>
                                <Text style={styles.vStatTrend}>+12.4% ↑</Text>
                            </View>
                            <View style={styles.vStatItem}>
                                <Text style={styles.vStatLabel}>BOOKINGS</Text>
                                <Text style={styles.vStatValue}>{selectedVenue.bookings}</Text>
                                <Text style={styles.vStatTrend}>+5.2% ↑</Text>
                            </View>
                        </View>

                        <View style={styles.capacitySection}>
                            <View style={styles.capacityHeader}>
                                <Text style={styles.capacityTitle}>Real-time Capacity</Text>
                                <Text style={styles.capacityPercent}>84%</Text>
                            </View>
                            <View style={styles.capacityBarBG}>
                                <View style={styles.capacityBarFill} />
                            </View>
                            <Text style={styles.capacitySubtitle}>156 / 180 Table Occupancy</Text>
                        </View>

                        <TouchableOpacity style={styles.vActionBtn} onPress={() => { setSelectedVenue(null); toastRef.current?.show({ title: "Report Generated", message: `Sales report for ${selectedVenue.name} sent to email.`, type: "success" }); }}>
                            <MaterialIcons name="file-download" size={20} color={COLORS.white} />
                            <Text style={styles.vActionBtnText}>Download Full Report</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* View All Venues Modal */}
            {showAllVenues && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>All Venues Portfolio</Text>
                            <TouchableOpacity onPress={() => setShowAllVenues(false)}>
                                <MaterialIcons name="close" size={24} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.fullVenueList} showsVerticalScrollIndicator={false}>
                            {ALL_VENUES.map((venue, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={styles.fullVenueItem} 
                                    onPress={() => {
                                        setShowAllVenues(false);
                                        setSelectedVenue(venue);
                                    }}
                                >
                                    <Image source={{ uri: venue.uri }} style={styles.fullVenueImg} />
                                    <View style={styles.fullVenueInfo}>
                                        <Text style={styles.fullVenueName}>{venue.name}</Text>
                                        <Text style={styles.fullVenueStats}>{venue.revenue} • {venue.bookings} Bookings</Text>
                                    </View>
                                    <MaterialIcons name="analytics" size={20} color={COLORS.primary} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            <PremiumToast ref={toastRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundDark,
    },
    header: {
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        zIndex: 50,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        padding: 8,
        backgroundColor: 'rgba(124, 77, 255, 0.2)',
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: 12,
        color: COLORS.slate400,
        fontWeight: '500',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 120,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    kpiScroll: {
        padding: 16,
        gap: 16,
    },
    kpiCard: {
        minWidth: 160,
        backgroundColor: COLORS.glassCardBg,
        borderWidth: 1,
        borderColor: COLORS.glassCardBorder,
        borderRadius: 16,
        padding: 20,
        marginRight: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    kpiLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.slate400,
        letterSpacing: 1,
    },
    kpiValue: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.white,
        marginTop: 8,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.teal,
    },
    sparkline: {
        marginTop: 12,
        opacity: 0.4,
    },
    sectionContainer: {
        paddingHorizontal: 16,
        marginTop: 24,
    },
    chartCard: {
        backgroundColor: COLORS.cardDark,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
    },
    chartSubHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    dateRange: {
        fontSize: 12,
        color: COLORS.slate400,
    },
    badge: {
        backgroundColor: 'rgba(0, 209, 178, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        color: COLORS.teal,
        fontSize: 10,
        fontWeight: '700',
    },
    legendContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 10,
        color: COLORS.slate400,
        fontWeight: '700',
    },
    chartArea: {
        height: 200,
        width: '100%',
        marginVertical: 16,
    },
    chartXLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    xLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.slate500,
    },
    listCard: {
        backgroundColor: COLORS.cardDark,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    venueList: {
        gap: 16,
    },
    venueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    venueLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    venueImg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    venueName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
    },
    venueStats: {
        fontSize: 12,
        color: COLORS.slate400,
        marginTop: 2,
    },
    doughnutContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginVertical: 24,
    },
    doughnutHole: {
        position: 'absolute',
        alignItems: 'center',
    },
    holeValue: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.white,
    },
    holeLabel: {
        fontSize: 10,
        color: COLORS.slate400,
        fontWeight: '700',
        letterSpacing: 1,
    },
    distributionLabels: {
        flexDirection: 'row',
        gap: 16,
    },
    distLabel: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 16,
    },
    distName: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.slate400,
        letterSpacing: 1,
    },
    distValue: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.white,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        paddingTop: 16,
        zIndex: 50,
    },
    navItem: {
        alignItems: 'center',
        gap: 4,
    },
    navText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.slate500,
        letterSpacing: 0.5,
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: COLORS.cardDark,
        borderRadius: 28,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.white,
    },
    venueProfileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginBottom: 32,
    },
    venueProfileImg: {
        width: 72,
        height: 72,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(126, 81, 251, 0.3)',
    },
    venueProfileName: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.white,
    },
    liveTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    livePulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.success,
    },
    liveTagText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.slate400,
        letterSpacing: 1,
    },
    venueDetailedStats: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
    },
    vStatItem: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    vStatLabel: {
        fontSize: 10,
        color: COLORS.slate500,
        fontWeight: '700',
        letterSpacing: 1,
    },
    vStatValue: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.white,
        marginTop: 6,
    },
    vStatTrend: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.success,
        marginTop: 4,
    },
    capacitySection: {
        backgroundColor: 'rgba(126, 81, 251, 0.05)',
        padding: 20,
        borderRadius: 20,
        marginBottom: 32,
    },
    capacityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    capacityTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.white,
    },
    capacityPercent: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.primary,
    },
    capacityBarBG: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    capacityBarFill: {
        height: '100%',
        width: '84%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    capacitySubtitle: {
        fontSize: 12,
        color: COLORS.slate500,
        marginTop: 12,
        textAlign: 'center',
    },
    vActionBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        borderRadius: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    vActionBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
    },
    fullVenueList: {
        maxHeight: 500,
    },
    fullVenueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    fullVenueImg: {
        width: 44,
        height: 44,
        borderRadius: 10,
    },
    fullVenueInfo: {
        flex: 1,
        marginLeft: 16,
    },
    fullVenueName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.white,
    },
    fullVenueStats: {
        fontSize: 12,
        color: COLORS.slate500,
        marginTop: 2,
    },
});
