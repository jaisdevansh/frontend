import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import adminService, { PendingHost } from '../../services/adminService';
import PremiumToast, { ToastRef } from '../../components/PremiumToast';
import PremiumToggle from '../../components/admin/PremiumToggle';

const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    border: 'rgba(255,255,255,0.06)',
    textWhite: '#ffffff',
    textDim: '#a0a0a0',
    danger: '#F43F5E',
    success: '#10B981',
    warning: '#f59e0b',
};

const HostRegistryRow = React.memo(({ item, onToggle, onDelete }: { 
    item: PendingHost, 
    onToggle: (id: string, currentStatus: string) => void,
    onDelete: (id: string) => void
}) => {
    const getStatusColor = () => {
        switch (item.hostStatus) {
            case 'ACTIVE': return COLORS.success;
            case 'SUSPENDED': return COLORS.danger;
            case 'PENDING_VERIFICATION': return COLORS.warning;
            default: return COLORS.primary;
        }
    };

    return (
        <View style={styles.hostCard}>
            <Image 
                source={{ uri: item.profileImage || `https://ui-avatars.com/api/?name=${item.fullName}&background=111&color=fff` }} 
                style={styles.avatar} 
            />
            <View style={styles.hostInfo}>
                <Text style={styles.hostName} numberOfLines={1}>{item.fullName}</Text>
                <Text style={styles.hostEmail} numberOfLines={1}>{item.email || item.phone}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                        {item.hostStatus?.replace('_', ' ')}
                    </Text>
                </View>
            </View>
            <View style={styles.actionArea}>
                <PremiumToggle 
                    value={item.hostStatus === 'ACTIVE'} 
                    onValueChange={() => onToggle(item._id, item.hostStatus)}
                />
                <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => onDelete(item._id)}
                >
                    <MaterialIcons name="delete-forever" size={20} color={COLORS.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );
});

export default function HostRegistryManagerScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const toastRef = React.useRef<ToastRef>(null);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useInfiniteQuery({
        queryKey: ['admin-manage-hosts', debouncedSearch],
        queryFn: ({ pageParam = 1 }) => adminService.getHosts(pageParam, 25, debouncedSearch),
        getNextPageParam: (lastPage) => lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
        initialPageParam: 1,
    });

    // ⚡ Optimistic Status Update Directive
    const toggleMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: 'ACTIVE' | 'SUSPENDED' }) => adminService.toggleHostStatus(id, status),
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['admin-manage-hosts'] });
            const previousData = queryClient.getQueryData(['admin-manage-hosts', debouncedSearch]);

            queryClient.setQueryData(['admin-manage-hosts', debouncedSearch], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((h: PendingHost) => 
                            h._id === variables.id ? { ...h, hostStatus: variables.status } : h
                        )
                    }))
                };
            });

            return { previousData };
        },
        onError: (err, varibales, context) => {
            queryClient.setQueryData(['admin-manage-hosts', debouncedSearch], context?.previousData);
            toastRef.current?.show({
                title: 'Operation Failed',
                message: 'Failed to update partner operational status',
                type: 'error'
            });
        },
        onSuccess: (_, variables) => {
            toastRef.current?.show({
                title: variables.status === 'ACTIVE' ? 'Partner Activated' : 'Partner Suspended',
                message: `Operational status updated in fleet registry`,
                type: variables.status === 'ACTIVE' ? 'success' : 'warning'
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-manage-hosts'] });
            queryClient.invalidateQueries({ queryKey: ['admin-hosts'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => adminService.deleteHost(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-manage-hosts'] });
            queryClient.invalidateQueries({ queryKey: ['admin-hosts'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
            
            toastRef.current?.show({
                title: 'Partner Purged',
                message: 'Identity and all associated data permanently removed',
                type: 'error'
            });
        }
    });

    const handleToggleStatus = useCallback((id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        toggleMutation.mutate({ id, status: nextStatus });
    }, [toggleMutation]);

    const handleDeleteHost = useCallback((id: string) => {
        Alert.alert(
            'Purge Partner?',
            'This will permanently delete the host and all associated events. Irreversible.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'PURGE REGISTRY', 
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(id)
                }
            ]
        );
    }, [deleteMutation]);

    const hosts = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);

    const renderItem = useCallback(({ item }: { item: PendingHost }) => (
        <HostRegistryRow item={item} onToggle={handleToggleStatus} onDelete={handleDeleteHost} />
    ), [handleToggleStatus, handleDeleteHost]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerTextGroup}>
                    <Text style={styles.title}>Host Fleet Registry</Text>
                    <Text style={styles.subtitle}>Partner governance & lifecycle</Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <MaterialIcons name="search" size={20} color={COLORS.textDim} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search partner fleet..."
                        placeholderTextColor={COLORS.textDim}
                        value={search}
                        onChangeText={setSearch}
                        autoCorrect={false}
                    />
                </View>
            </View>

            <View style={{ flex: 1 }}>
                <FlashList 
                    data={hosts}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    // @ts-ignore
                    estimatedItemSize={100}
                    contentContainerStyle={styles.listContent}
                    onEndReached={() => hasNextPage && fetchNextPage()}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => isFetchingNextPage ? <ActivityIndicator style={{ margin: 20 }} color={COLORS.primary} /> : null}
                    ListEmptyComponent={() => !isLoading ? (
                        <View style={styles.emptyBox}>
                            <MaterialIcons name="business-center" size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>No matching partners found</Text>
                        </View>
                    ) : <ActivityIndicator style={{ marginTop: 100 }} color={COLORS.primary} />}
                />
            </View>
            <PremiumToast ref={toastRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    headerTextGroup: { flex: 1 },
    title: { fontSize: 22, fontWeight: '900', color: COLORS.textWhite },
    subtitle: { fontSize: 12, color: COLORS.textDim, fontWeight: '600', marginTop: 2 },
    searchContainer: { paddingHorizontal: 24, marginBottom: 24 },
    searchBox: { height: 56, backgroundColor: COLORS.card, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.border },
    searchInput: { flex: 1, marginLeft: 12, color: COLORS.textWhite, fontSize: 14, fontWeight: '600' },
    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    hostCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
    avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#111' },
    hostInfo: { flex: 1, marginLeft: 16 },
    hostName: { color: COLORS.textWhite, fontSize: 16, fontWeight: '800' },
    hostEmail: { color: COLORS.textDim, fontSize: 12, marginTop: 2, fontWeight: '600' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
    actionArea: { marginLeft: 16, alignItems: 'center', gap: 12 },
    deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(244, 63, 94, 0.1)', justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: COLORS.textDim, fontSize: 14, marginTop: 16, fontWeight: '600' },
});
