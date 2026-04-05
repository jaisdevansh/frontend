import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import adminService, { PendingHost } from '../../services/adminService';
import { UserListSkeleton } from '../../components/admin/AdminSkeleton';

const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    border: 'rgba(255,255,255,0.06)',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
    success: '#10B981',
    warning: '#f59e0b',
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

const HostRow = React.memo(({ item, onPress }: { item: PendingHost, onPress: (id: string) => void }) => {
    const getStatusColor = () => {
        switch (item.hostStatus) {
            case 'ACTIVE': return COLORS.success;
            case 'PENDING_VERIFICATION': return COLORS.warning;
            case 'CREATED': return '#3b82f6';
            case 'REJECTED': return COLORS.danger;
            default: return COLORS.textDim;
        }
    };

    const formattedAvatar = useMemo(() => {
        if (!item.profileImage) return `https://ui-avatars.com/api/?name=${item.name}&background=111&color=fff`;
        return item.profileImage.includes('cloudinary.com') 
            ? item.profileImage.replace('/upload/', '/upload/q_auto,f_auto,c_scale,w_150/') 
            : item.profileImage;
    }, [item.profileImage, item.name]);

    return (
        <TouchableOpacity 
            style={styles.hostCard} 
            activeOpacity={0.7}
            onPress={() => onPress(item._id)}
        >
            <Image 
                source={{ uri: formattedAvatar }} 
                style={styles.avatarImg}
                cachePolicy="memory-disk"
                transition={200}
            />
            <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{item.name}</Text>
                <Text style={styles.hostEmail}>{item.email || item.phone}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                        {item.hostStatus?.replace('_', ' ')}
                    </Text>
                </View>
            </View>
            <View style={styles.hostRight}>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.textDim} />
            </View>
        </TouchableOpacity>
    );
});

export default function HostsScreen() {
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
        queryKey: ['admin-hosts', debouncedSearch],
        queryFn: ({ pageParam = 1 }) => adminService.getHosts(pageParam, 30, debouncedSearch),
        getNextPageParam: (lastPage) => (lastPage.pages > lastPage.page ? lastPage.page + 1 : undefined),
        initialPageParam: 1,
        staleTime: 60000,
    });

    const hosts = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);
    const total = data?.pages[0]?.total || 0;

    const handleHostPress = useCallback((id: string) => {
        router.push(`/admin/host-details/${id}` as any);
    }, [router]);

    const renderItem = useCallback(({ item }: { item: PendingHost }) => <HostRow item={item} onPress={handleHostPress} />, [handleHostPress]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Host Registry</Text>
                    <Text style={styles.subtitle}>{total} partners provisioned</Text>
                </View>
                {isLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>

            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={20} color={COLORS.textDim} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search hosts..."
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
            ) : hosts.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialIcons name="business-center" size={60} color={COLORS.textDim} />
                    <Text style={styles.emptyTitle}>No Hosts Found</Text>
                    <Text style={styles.emptySubtitle}>Start by provisioning a new host from dashboard.</Text>
                </View>
            ) : (
                <FlashList
                    data={hosts}
                    keyExtractor={(it: PendingHost) => it._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    // @ts-ignore
                    estimatedItemSize={80}
                    removeClippedSubviews={true}
                    windowSize={7}
                    initialNumToRender={8}
                    maxToRenderPerBatch={10}
                    updateCellsBatchingPeriod={50}
                    onEndReached={() => {
                        if (hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                    }}
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
    hostCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#000' },
    avatarImg: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#111' },
    hostInfo: { flex: 1, marginLeft: 16 },
    hostName: { color: COLORS.textWhite, fontSize: 16, fontWeight: '800' },
    hostEmail: { color: COLORS.textDim, fontSize: 12, marginTop: 2, fontWeight: '500' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
    statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    hostRight: { alignItems: 'flex-end', justifyContent: 'center' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { color: COLORS.textWhite, fontSize: 20, fontWeight: '900', marginTop: 16 },
    emptySubtitle: { color: COLORS.textDim, fontSize: 14, marginTop: 8, textAlign: 'center' },
});
