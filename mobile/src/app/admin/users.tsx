import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, Pressable, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import adminService, { AdminUser } from '../../services/adminService';
import { UserListSkeleton } from '../../components/admin/AdminSkeleton';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    cardElevated: '#111111',
    border: 'rgba(255,255,255,0.06)',
    textWhite: '#ffffff',
    textDim: '#888888',
    success: '#10B981',
    danger: '#F43F5E',
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const UserRow = React.memo(({ item, onPress }: { item: AdminUser, onPress: (id: string) => void }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable 
                style={({ pressed }) => [styles.userCard, pressed && { backgroundColor: COLORS.cardElevated, borderColor: 'rgba(255,255,255,0.1)' }]} 
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onPress(item._id)}
            >
                <View style={styles.avatarContainer}>
                    <Image 
                        source={{ uri: item.profileImage || `https://ui-avatars.com/api/?name=${item.name}&background=1a1a1a&color=fff&bold=true` }} 
                        style={styles.avatarImg}
                        cachePolicy="memory-disk"
                    />
                    <View style={styles.avatarRing} />
                </View>
                
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{item.name || 'Anonymous User'}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{item.email || item.phone || 'N/A'}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: item.role === 'ADMIN' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)' }]}>
                        <MaterialIcons name={item.role === 'ADMIN' ? 'admin-panel-settings' : 'person'} size={10} color={item.role === 'ADMIN' ? COLORS.primary : COLORS.textDim} />
                        <Text style={[styles.roleText, { color: item.role === 'ADMIN' ? COLORS.primary : COLORS.textWhite }]}>
                            {item.role?.toUpperCase() || 'USER'}
                        </Text>
                    </View>
                </View>
                <View style={styles.userRight}>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusGlow, { backgroundColor: item.isActive ? COLORS.success : COLORS.danger }]} />
                        <View style={[styles.statusDot, { backgroundColor: item.isActive ? COLORS.success : COLORS.danger }]} />
                    </View>
                    <View style={styles.actionBtn}>
                        <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
});

export default function UsersScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const { 
        data, 
        isLoading, 
        isFetchingNextPage, 
        fetchNextPage, 
        hasNextPage,
        refetch,
        isRefetching
    } = useInfiniteQuery({
        queryKey: ['admin-users', debouncedSearch],
        queryFn: ({ pageParam = 1 }) => adminService.getUsers(pageParam, 30, debouncedSearch),
        getNextPageParam: (lastPage) => (lastPage.pages > lastPage.page ? lastPage.page + 1 : undefined),
        initialPageParam: 1,
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });

    const users = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);
    const total = data?.pages[0]?.total || 0;

    const navigateToUser = useCallback((id: string) => {
        router.push(`/admin/user-details/${id}` as any);
    }, [router]);

    const renderItem = useCallback(({ item }: { item: AdminUser }) => (
        <UserRow item={item} onPress={navigateToUser} />
    ), [navigateToUser]);


    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0a0a14', '#050510', '#000000']}
                style={StyleSheet.absoluteFillObject}
            />
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>User Intel</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={styles.statsDot} />
                        <Text style={styles.subtitle}>{total.toLocaleString()} identities managed</Text>
                    </View>
                </View>
                {isLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>

            <View style={styles.searchWrapper}>
                <View style={[
                    styles.searchContainer, 
                    isSearchFocused && { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.05)' }
                ]}>
                    <MaterialIcons name="search" size={20} color={isSearchFocused ? COLORS.primary : COLORS.textDim} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or email..."
                        placeholderTextColor={COLORS.textDim}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, right: 10, left: 10 }}>
                            <View style={styles.clearBtn}>
                                <MaterialIcons name="close" size={14} color="#000" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {isLoading ? (
                <UserListSkeleton />
            ) : users.length === 0 ? (
                <View style={styles.centered}>
                    <View style={styles.emptyIconBg}>
                        <MaterialIcons name="person-off" size={40} color="rgba(255,255,255,0.4)" />
                    </View>
                    <Text style={styles.emptyTitle}>Identity Not Found</Text>
                    <Text style={styles.emptySubtitle}>Refine your search parameters or query another identity string.</Text>
                </View>
            ) : (
                <FlashList
                    data={users}
                    keyExtractor={(it: AdminUser) => it._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    // @ts-ignore
                    estimatedItemSize={90}
                    onEndReached={() => hasNextPage && fetchNextPage()}
                    onEndReachedThreshold={0.5}
                    refreshing={isRefetching}
                    onRefresh={refetch as any}
                    ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.primary} /> : null}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    headerInfo: { flex: 1 },
    title: { fontSize: 28, fontWeight: '900', color: COLORS.textWhite, letterSpacing: -0.5 },
    statsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, marginRight: 6, shadowColor: COLORS.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
    subtitle: { fontSize: 13, color: COLORS.textDim, fontWeight: '600' },
    searchWrapper: { paddingHorizontal: 24, marginBottom: 20 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: 16, height: 56, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    searchInput: { flex: 1, marginLeft: 12, color: COLORS.textWhite, fontSize: 15, fontWeight: '600' },
    clearBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.textDim, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 24, paddingBottom: 120 },
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
    avatarContainer: { position: 'relative', width: 56, height: 56 },
    avatarImg: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#111' },
    avatarRing: { ...StyleSheet.absoluteFillObject, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    userInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
    userName: { color: COLORS.textWhite, fontSize: 16, fontWeight: '800', letterSpacing: -0.3, marginBottom: 2 },
    userEmail: { color: COLORS.textDim, fontSize: 13, fontWeight: '500', fontFamily: 'monospace' },
    roleBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    userRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 16 },
    statusContainer: { position: 'relative', width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
    statusGlow: { position: 'absolute', width: 16, height: 16, borderRadius: 8, opacity: 0.2 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
    emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyTitle: { color: COLORS.textWhite, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    emptySubtitle: { color: COLORS.textDim, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22 },
});
