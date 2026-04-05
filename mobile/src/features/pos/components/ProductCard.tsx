import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/design-system';

interface ProductItem {
    _id: string;
    name: string;
    price: number;
    image?: string;
    type: string;
}

interface ProductCardProps {
    item: ProductItem;
    onAdd: (itemId: string) => void;
}

/**
 * Pure, memoized ProductCard for POS Grid.
 * Optimized for rapid interaction and 60fps scrolling.
 * Uses O(1) store addition by ID.
 */
export const ProductCard = React.memo(({ item, onAdd }: ProductCardProps) => {
    const handlePress = useCallback(() => {
        onAdd(item._id);
    }, [item._id, onAdd]);

    return (
        <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.7}
            onPress={handlePress}
        >
            <Image 
                source={{ uri: item.image || 'https://via.placeholder.com/150' }} 
                style={styles.image} 
                contentFit="cover"
                transition={200}
            />
            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <View style={styles.footer}>
                    <Text style={styles.price}>₹{item.price}</Text>
                    <View style={styles.addBtn}>
                        <Ionicons name="add" size={16} color="white" />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}, (prev, next) => (
    prev.item._id === next.item._id && prev.item.price === next.item.price
));

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 18,
        margin: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    image: {
        width: '100%',
        height: 110,
        backgroundColor: '#111',
    },
    content: {
        padding: 10,
    },
    name: {
        color: 'white',
        fontSize: 13,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    price: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '800',
    },
    addBtn: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
