import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../../../constants/design-system';

interface MenuItemProps {
    item: {
        _id: string;
        name: string;
        description: string;
        price: number;
        image: string;
        type: string;
    };
    onPress?: () => void;
}

/**
 * Optimized MenuItem component.
 * Exact visual match with original PremiumMenu UI.
 */
export const MenuItem = React.memo(({ item, onPress }: MenuItemProps) => (
    <TouchableOpacity
        style={[
            styles.drinkCard,
            item.type === 'Cocktail' && styles.drinkCardPremium
        ]}
        onPress={onPress}
        activeOpacity={0.9}
    >
        <View style={styles.drinkInfo}>
            <View>
                <View style={styles.drinkTypeRow}>
                    <Text style={[
                        styles.drinkType,
                        item.type === 'Cocktail' && { color: COLORS.primary },
                    ]}>{(item.type || 'Standard').toUpperCase()}</Text>
                    {item.type === 'Cocktail' && <View style={styles.typeDot} />}
                </View>
                <Text style={styles.drinkName}>{item.name}</Text>
                <Text style={styles.drinkDesc}>{item.description || 'Premium curated flavor.'}</Text>
            </View>

            <View style={styles.drinkFooter}>
                <View style={[styles.priceTag, item.type === 'Cocktail' && { backgroundColor: COLORS.primary }]}>
                    <Text style={styles.priceText}>₹{item.price || 1500}</Text>
                </View>

                <View style={[styles.statusTag, styles.statusAvailable]}>
                    <View style={[styles.statusDot, { backgroundColor: '#4ade80' }]} />
                    <Text style={[styles.statusText, { color: '#4ade80' }]}>AVAILABLE</Text>
                </View>
            </View>
        </View>
        <Image 
            source={{ uri: item.image || 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500&auto=format&fit=crop&q=60' }} 
            style={styles.drinkImage} 
        />
    </TouchableOpacity>
), (prev, next) => (
    prev.item._id === next.item._id && prev.item.price === next.item.price
));

const styles = StyleSheet.create({
    drinkCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(20, 15, 35, 0.7)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    drinkCardPremium: {
        borderColor: 'rgba(124, 77, 255, 0.4)',
    },
    drinkInfo: {
        flex: 1,
        justifyContent: 'space-between',
        paddingRight: 16,
    },
    drinkTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    drinkType: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
    },
    typeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(124, 77, 255, 0.4)',
    },
    drinkName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    drinkDesc: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 4,
        fontStyle: 'italic',
    },
    drinkFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        gap: 12,
    },
    priceTag: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    priceText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        borderColor: 'rgba(74, 222, 128, 0.2)',
    },
    statusAvailable: {},
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    drinkImage: {
        width: 100,
        height: 100,
        borderRadius: 16,
    },
});
