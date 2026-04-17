import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeFlashList from '../../components/SafeFlashList';

// Safe Alias
const FlashList = SafeFlashList;
import { COLORS } from '../../constants/design-system';
import { userService } from '../../services/userService';
import { useFoodStore } from '../../store/foodStore';
import { MenuItem } from '../../features/food/components/MenuItem';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../services/apiClient';
import apiClient from '../../services/apiClient';

export default function PremiumMenu() {
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const { eventId, venueName: paramVenueName, hostId, bookingId, tableId } = params;
    const insets = useSafeAreaInsets();

    // Store Logic (for eventId path)
    const { menuItems, setMenu, loading, setLoading, categories } = useFoodStore();
    const [selectedCategory, setSelectedCategory] = useState('');
    const [venueName] = useState(paramVenueName ? String(paramVenueName) : 'Exclusive Menu');

    // ── LOCAL STATE for hostId path (bypasses Zustand to avoid stale state) ──
    const [localItems, setLocalItems] = useState<any[]>([]);
    const [localCategories, setLocalCategories] = useState<string[]>([]);
    const [localLoading, setLocalLoading] = useState(false);
    const isHostMode = !!hostId;

    // ── hostId fetch (runs once on mount) ──
    useEffect(() => {
        if (!hostId) return;
        setLocalLoading(true);
        const hid = Array.isArray(hostId) ? hostId[0] : String(hostId);
        apiClient.get(`/user/host/${hid}/menu`)
            .then(res => {
                if (res.data?.success && res.data.data?.length) {
                    const items = res.data.data.map((i: any) => ({
                        ...i,
                        type: i.category ?? i.type,
                        description: i.desc || i.description || '',
                    }));
                    setLocalItems(items);
                    const cats = ['All', ...Array.from(new Set(items.map((i: any) => i.type).filter(Boolean))) as string[]];
                    setLocalCategories(cats);
                    setSelectedCategory('All');
                }
            })
            .catch(err => {
                // Silent error
            })
            .finally(() => setLocalLoading(false));
    }, []); // mount-once is correct — hostId is stable

    // ── eventId fetch ── (removed selectedCategory from deps — was re-fetching on every tab)
    const fetchMenu = useCallback(async () => {
        if (isHostMode || !eventId) return;
        setLoading(true);
        try {
            const res = await userService.getMenuItems(eventId as string);
            if (res.success && res.data) {
                setMenu(res.data);
                if (res.data.length > 0 && !selectedCategory) {
                    setSelectedCategory(res.data[0].type || 'All');
                }
            }
        } catch (err) {
            // Silent error
        } finally {
            setLoading(false);
        }
    }, [eventId, setMenu, setLoading, isHostMode]); // ← selectedCategory REMOVED from deps

    useEffect(() => { fetchMenu(); }, [fetchMenu]);

    useEffect(() => {
        if (isHostMode || !eventId) return;
        // Defer socket to after first paint — doesn't block data display
        const timer = setTimeout(() => {
            const socket = io(API_BASE_URL);
            socket.on('menu_updated', () => fetchMenu());
            return () => { socket.disconnect(); };
        }, 1500);
        return () => clearTimeout(timer);
    }, [fetchMenu, isHostMode]);

    // ── Derived display data (memoized for performance) ──
    const displayItems = useMemo(() => {
        const source = isHostMode ? localItems : menuItems;
        if (!selectedCategory || selectedCategory === 'All') return source;
        return source.filter((i: any) => (i.type || i.category) === selectedCategory);
    }, [isHostMode, localItems, menuItems, selectedCategory]);

    const displayCategories = isHostMode ? localCategories : categories;
    const isLoading = isHostMode ? localLoading : loading;

    const renderItem = useCallback(({ item }: { item: any }) => (
        <MenuItem item={item} />
    ), []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <View style={styles.headerTitleBox}>
                            <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                            <Text style={styles.headerTitle}>Member-only Mixology</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>{venueName.toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity style={styles.headerBtn}>
                        <Ionicons name="search" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Category tabs — shown in ALL modes */}
                {displayCategories.length > 0 && (
                    <FlashList
                        horizontal
                        data={displayCategories}
                        renderItem={({ item }: { item: any }) => (
                            <TouchableOpacity
                                onPress={() => setSelectedCategory(item)}
                                style={[styles.categoryBtn, selectedCategory === item && styles.categoryBtnActive]}
                            >
                                <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>{item}</Text>
                            </TouchableOpacity>
                        )}
                        estimatedItemSize={100}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                    />
                )}
            </View>

            {isLoading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loaderTxt}>Fetching elite menu...</Text>
                </View>
            ) : (
                <FlashList
                    data={displayItems}
                    renderItem={renderItem}
                    keyExtractor={(item: any) => item._id}
                    estimatedItemSize={150}
                    contentContainerStyle={styles.scrollContent}
                    ListHeaderComponent={() => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Curated Selections</Text>
                            <View style={styles.headerLine} />
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyStateContainer}>
                            {!isHostMode ? (
                                <>
                                    <Ionicons name="calendar" size={64} color="rgba(255,255,255,0.2)" />
                                    <Text style={styles.emptyStateTitle}>Menu Unavailable</Text>
                                    <Text style={styles.emptyStateDesc}>You need to book an active event or table to see the menu for this venue or host.</Text>
                                </>
                            ) : (
                                <Text style={styles.emptyTxt}>No items available in this category.</Text>
                            )}
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.dark },
    header: { backgroundColor: 'rgba(20, 15, 35, 0.7)', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20 },
    headerTitleContainer: { alignItems: 'center' },
    headerTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.5 },
    headerSubtitle: { color: COLORS.primary, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    categoryScroll: { paddingHorizontal: 16, paddingBottom: 20 },
    categoryBtn: { height: 40, paddingHorizontal: 24, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    categoryBtnActive: { backgroundColor: COLORS.primary, borderColor: 'rgba(124, 77, 255, 0.5)' },
    categoryText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    categoryTextActive: { color: '#FFFFFF' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
    sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 },
    headerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 16 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loaderTxt: { color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 13, fontWeight: '600' },
    emptyTxt: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 40 },
    emptyStateContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 30 },
    emptyStateTitle: { color: 'white', fontSize: 20, fontWeight: '800', marginTop: 20, marginBottom: 8 },
    emptyStateDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22 }
});
