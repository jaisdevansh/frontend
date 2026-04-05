import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import adminService, { AdminUser } from '../../services/adminService';
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
};

const UserBanRow = React.memo(({ item, onToggle, onDelete }: { 
    item: AdminUser, 
    onToggle: (id: string, currentStatus: boolean) => void,
    onDelete: (id: string) => void
}) => {
    return (
        <View style={styles.userCard}>
            <Image 
                source={{ uri: item.profileImage || `https://ui-avatars.com/api/?name=${item.name}&background=111&color=fff` }} 
                style={styles.avatar} 
            />
            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{item.email || item.phone}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                    <Text style={[styles.statusText, { color: item.isActive ? COLORS.success : COLORS.danger }]}>
                        {item.isActive ? 'ACCOUNT ACTIVE' : 'ACCESS REVOKED'}
                    </Text>
                </View>
            </View>
            <View style={styles.actionArea}>
                <PremiumToggle 
                    value={item.isActive} 
                    onValueChange={() => onToggle(item._id, item.isActive)}
                />
                <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => onDelete(item._id)}
                >
                    <MaterialIcons name="delete-outline" size={20} color="rgba(244, 63, 94, 0.7)" />
                </TouchableOpacity>
            </View>
        </View>
    );
});

export default function BanManagerScreen() {
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
        queryKey: ['admin-ban-users', debouncedSearch],
        queryFn: ({ pageParam = 1 }) => adminService.getUsers(pageParam, 25, debouncedSearch),
        getNextPageParam: (lastPage) => lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
        initialPageParam: 1,
    });

    // ⚡ Optimistic Status Update Directive
    const statusMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => adminService.toggleUserStatus(id, isActive),
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['admin-ban-users'] });
            const previousData = queryClient.getQueryData(['admin-ban-users', debouncedSearch]);

            // Optimistically update the infinite query cache
            queryClient.setQueryData(['admin-ban-users', debouncedSearch], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((u: AdminUser) => 
                            u._id === variables.id ? { ...u, isActive: variables.isActive } : u
                        )
                    }))
                };
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['admin-ban-users', debouncedSearch], context?.previousData);
            toastRef.current?.show({
                title: 'Operation Failed',
                message: 'Failed to update identity status',
                type: 'error'
            });
        },
        onSuccess: (_, variables) => {
            toastRef.current?.show({
                title: variables.isActive ? 'Access Restored' : 'Access Revoked',
                message: `Identity status updated in fleet registry`,
                type: variables.isActive ? 'success' : 'warning'
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-ban-users'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => adminService.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-ban-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
            
            toastRef.current?.show({
                title: 'Identity Purged',
                message: 'Account permanently removed from system',
                type: 'error'
            });
        }
    });

    const handleToggleStatus = useCallback((id: string, currentStatus: boolean) => {
        statusMutation.mutate({ id, isActive: !currentStatus });
    }, [statusMutation]);

    const handleDeleteUser = useCallback((id: string) => {
        Alert.alert(
            'Purge Identity?',
            'This will permanently delete the user account and all booking history. IRREVERSIBLE.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'PURGE USER', 
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(id)
                }
            ]
        );
    }, [deleteMutation]);

    const users = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);

    const renderItem = useCallback(({ item }: { item: AdminUser }) => (
        <UserBanRow item={item} onToggle={handleToggleStatus} onDelete={handleDeleteUser} />
    ), [handleToggleStatus, handleDeleteUser]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerTextGroup}>
                    <Text style={styles.title}>Secure Ban Terminal</Text>
                    <Text style={styles.subtitle}>Enforce system access policies</Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <MaterialIcons name="search" size={20} color={COLORS.textDim} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Scan for specific identities..."
                        placeholderTextColor={COLORS.textDim}
                        value={search}
                        onChangeText={setSearch}
                        autoCorrect={false}
                    />
                </View>
            </View>

            <View style={{ flex: 1 }}>
                <FlashList 
                    data={users}
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
                            <MaterialIcons name="person-search" size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>No matching identities found</Text>
                        </ View>
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
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
    avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#111' },
    userInfo: { flex: 1, marginLeft: 16 },
    userName: { color: COLORS.textWhite, fontSize: 16, fontWeight: '800' },
    userEmail: { color: COLORS.textDim, fontSize: 12, marginTop: 2, fontWeight: '600' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    actionArea: { marginLeft: 16, alignItems: 'center', gap: 12 },
    deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(244, 63, 94, 0.08)', justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: COLORS.textDim, fontSize: 14, marginTop: 16, fontWeight: '600' },
});
