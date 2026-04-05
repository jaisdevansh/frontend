import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Dimensions, StatusBar } from 'react-native';
import SafeFlashList from '../../components/SafeFlashList';

// Safe Alias for optimization
const FlashList = SafeFlashList;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/design-system';
import { usePOSStore } from '../../store/posStore';
import { ProductCard } from '../../features/pos/components/ProductCard';
import { CartSidebar } from '../../features/pos/components/CartSidebar';
import { hostService } from '../../services/hostService';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');

export default function POSScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { showToast } = useToast();
    const { products, setProducts, addToCart } = usePOSStore();
    
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const res = await hostService.getVenueProfile();
                if (res.success) {
                    setProducts(res.data.menu || []);
                }
            } catch (err) {
                showToast('Failed to load menu', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, [setProducts, showToast]);

    const filteredItems = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = category === 'All' || p.type === category;
            return matchesSearch && matchesCategory;
        });
    }, [products, search, category]);

    const categories = useMemo(() => 
        ['All', ...Array.from(new Set(products.map(p => p.type)))],
    [products]);

    const renderProduct = useCallback(({ item }: { item: any }) => (
        <ProductCard item={item} onAdd={addToCart} />
    ), [addToCart]);

    const renderHeader = (
        <View style={styles.header}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="rgba(255,255,255,0.3)" />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search menu..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <View style={styles.catScroll}>
                <FlashList
                    horizontal
                    data={categories}
                    estimatedItemSize={80}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }: { item: string }) => (
                        <TouchableOpacity 
                            style={[styles.catBtn, category === item && styles.catBtnActive]}
                            onPress={() => setCategory(item)}
                        >
                            <Text style={[styles.catText, category === item && styles.catTextActive]}>
                                {item.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" translucent />
            
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>POS Terminal</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.mainContent}>
                <View style={styles.gridSection}>
                    <FlashList
                        data={filteredItems}
                        renderItem={renderProduct}
                        estimatedItemSize={200}
                        numColumns={2}
                        keyExtractor={(item: any) => item._id}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={styles.listContent}
                    />
                </View>
                
                <View style={styles.cartSection}>
                    <CartSidebar />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: '800' },
    loader: { flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' },
    mainContent: { flex: 1, flexDirection: 'row' },
    gridSection: { flex: 0.65 },
    cartSection: { flex: 0.35, padding: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    header: { marginVertical: 20 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 16, paddingHorizontal: 16, height: 52, marginBottom: 16 },
    searchInput: { flex: 1, color: 'white', fontSize: 15, marginLeft: 12, fontWeight: '600' },
    catScroll: { height: 44 },
    catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#111', marginRight: 10 },
    catBtnActive: { backgroundColor: COLORS.primary },
    catText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800' },
    catTextActive: { color: 'white' }
});
