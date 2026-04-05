import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { thumb } from '../../../services/cloudinaryService';

interface GiftItem {
    _id: string;
    id?: string;
    name: string;
    image?: string;
    price: number;
    description?: string;
    desc?: string;
    category?: string;
}

interface GiftCardProps {
    item: GiftItem;
    isSelected: boolean;
    onSelect: (item: GiftItem) => void;
}

export const GiftCard = React.memo(({ item, isSelected, onSelect }: GiftCardProps) => {
    const pts = Math.floor(item.price * 20);

    return (
        <TouchableOpacity
            style={[styles.card, isSelected && styles.cardActive]}
            onPress={() => onSelect(item)}
            activeOpacity={0.88}
        >
            {/* Image */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: thumb(item.image) }}
                    style={styles.image}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                {/* Category pill */}
                {item.category ? (
                    <View style={styles.catPill}>
                        <Text style={styles.catText} numberOfLines={1}>{item.category}</Text>
                    </View>
                ) : null}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>

                <View style={styles.footer}>
                    <View>
                        <Text style={styles.price}>₹{item.price}</Text>
                        <Text style={styles.points}>{pts.toLocaleString()} PTS</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.selectBtn, isSelected && styles.selectBtnActive]}
                        onPress={() => onSelect(item)}
                    >
                        {isSelected
                            ? <Ionicons name="checkmark" size={14} color="#FFF" />
                            : <Text style={styles.selectBtnText}>Gift</Text>
                        }
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}, (prev, next) =>
    prev.isSelected === next.isSelected &&
    (prev.item._id || prev.item.id) === (next.item._id || next.item.id)
);

const styles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: '#131521',
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardActive: {
        borderColor: '#7c4dff',
        borderWidth: 2,
    },
    imageContainer: {
        width: '100%',
        height: 130,
        backgroundColor: '#0A0C16',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    catPill: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    catText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    content: {
        padding: 10,
    },
    title: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: -0.2,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    price: {
        color: '#8B5CF6',
        fontSize: 14,
        fontWeight: '900',
    },
    points: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    selectBtn: {
        backgroundColor: '#7c4dff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 46,
    },
    selectBtnActive: {
        backgroundColor: '#4f46e5',
    },
    selectBtnText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
    },
});
