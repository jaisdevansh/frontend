import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import adminService, { AdminUser } from '../../services/adminService';
import { UserListSkeleton } from '../../components/admin/AdminSkeleton';


const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    border: 'rgba(255,255,255,0.06)',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
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
    return (
        <TouchableOpacity 
            style={styles.userCard} 
            activeOpacity={0.7}
            onPress={() => onPress(item._id)}
        >
            <Image 
                source={{ uri: item.profileImage || `https://ui-avatars.com/api/?name=${item.name}&background=111&color=fff` }} 
                style={styles.avatarImg}
                cachePolicy="memory-disk"
            />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email || item.phone}</Text>
                <View style={[styles.roleBadge, { backgroundColor: item.role === 'ADMIN' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)' }]}>
                    <Text style={[styles.roleText, { color: item.role === 'ADMIN' ? COLORS.primary : COLORS.textDim }]}>
                        {item.role?.toUpperCase()}
                    </Text>
                </View>
            </View>
            <View style={styles.userRight}>
                <View style={[styles.statusGlow, { backgroundColor: item.isActive ? COLORS.success : COLORS.danger }]} />
                <MaterialIcons name="chevron-right" size={20} color={COLORS.textDim} />
            </View>
        </TouchableOpacity>
    );
});

export default function UsersScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>User Intel</Text>
                    <Text style={styles.subtitle}>{total.toLocaleString()} identities managed</Text>
                </View>
                {isLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>

            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={20} color={COLORS.textDim} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or email..."
                        placeholderTextColor={COLORS.textDim}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}><MaterialIcons name="close" size={20} color={COLORS.textDim} /></TouchableOpacity>
                    )}
                </View>
            </View>

            {isLoading ? (
                <UserListSkeleton />
            ) : users.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialIcons name="person-off" size={60} color={COLORS.textDim} />
                    <Text style={styles.emptyTitle}>Identity Not Found</Text>
                    <Text style={styles.emptySubtitle}>Refine your search parameters.</Text>
                </View>
            ) : (
                <FlashList
                    data={users}
                    keyExtractor={(it: AdminUser) => it._id}

                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    // @ts-ignore
                    estimatedItemSize={80}
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
    header: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: COLORS.border },
    headerInfo: { flex: 1 },
    title: { fontSize: 24, fontWeight: '900', color: COLORS.textWhite },
    subtitle: { fontSize: 13, color: COLORS.textDim, marginTop: 2, fontWeight: '600' },
    searchWrapper: { paddingHorizontal: 24, marginBottom: 20 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: 16, height: 56, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border },
    searchInput: { flex: 1, marginLeft: 12, color: COLORS.textWhite, fontSize: 15, fontWeight: '600' },
    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
    avatarImg: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#111' },
    userInfo: { flex: 1, marginLeft: 16 },
    userName: { color: COLORS.textWhite, fontSize: 16, fontWeight: '800' },
    userEmail: { color: COLORS.textDim, fontSize: 12, marginTop: 2, fontWeight: '500' },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
    roleText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    userRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 12 },
    statusGlow: { width: 8, height: 8, borderRadius: 4 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { color: COLORS.textWhite, fontSize: 20, fontWeight: '900', marginTop: 16 },
    emptySubtitle: { color: COLORS.textDim, fontSize: 14, marginTop: 8, textAlign: 'center' },
});
