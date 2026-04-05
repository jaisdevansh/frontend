import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface User {
    id: string;
    _id: string;
    name: string;
    image: string;
    distance: number;
    tags: string[];
}

interface MatchCardProps {
    user: User;
    onSayHi: () => void;
    onBuyDrink: () => void;
}

/**
 * Pure, memoized MatchCard for Discovery Radar.
 * Strictly maintains the original "Premium" aesthetic.
 */
export const MatchCard = React.memo(({ user, onSayHi, onBuyDrink }: MatchCardProps) => (
    <View style={styles.matchCard}>
        <Image source={{ uri: user.image || 'https://via.placeholder.com/150' }} style={styles.matchAv} />
        <View style={styles.matchInfo}>
            <View style={styles.matchNameRow}>
                <Text style={styles.matchName}>{user.name}</Text>
                <View style={styles.dot} />
                <Text style={styles.matchDist}>{user.distance}m away</Text>
            </View>
            <View style={styles.tagsRow}>
                {(user.tags || []).map((t) => (
                    <View key={t} style={styles.tag}><Text style={styles.tagTxt}>{t}</Text></View>
                ))}
            </View>
        </View>
        <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.hiBtn, styles.btnSec]} onPress={onSayHi}>
                <Text style={[styles.hiBtnTxt, { color: '#FFF' }]}>Say Hi 👋</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.hiBtn, styles.btnPrim]} onPress={onBuyDrink}>
                <Text style={styles.hiBtnTxt}>Buy Drink 🍸</Text>
            </TouchableOpacity>
        </View>
    </View>
), (prev, next) => (
    prev.user.id === next.user.id && prev.user.distance === next.user.distance
));

const styles = StyleSheet.create({
    matchCard: {
        backgroundColor: 'rgba(20, 15, 35, 0.7)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    matchAv: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#111',
    },
    matchInfo: {
        marginTop: 12,
    },
    matchNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    matchName: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    matchDist: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    tagTxt: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '700',
    },
    btnRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    hiBtn: {
        flex: 1,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnSec: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    btnPrim: {
        backgroundColor: '#7c4dff',
    },
    hiBtnTxt: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
    },
});
