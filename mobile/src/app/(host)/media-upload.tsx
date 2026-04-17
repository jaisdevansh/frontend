import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, ActivityIndicator, Dimensions,
    Alert, StatusBar, Animated
} from 'react-native';
import { Image } from 'expo-image';
import { useStrictBack } from '../../hooks/useStrictBack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../../context/ToastContext';
import { hostService } from '../../services/hostService';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { uploadImage } from '../../services/cloudinaryService';

const { width } = Dimensions.get('window');
// 3 columns, 20px padding on each side (40), 10px gap between columns (20) -> width - 60
const GAP = 12;
const THUMB = (width - 40 - (GAP * 2)) / 3; 

type Category = 'interior' | 'events';

const TABS: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; gradient: [string, string]; desc: string }[] = [
    {
        key: 'interior',
        label: 'Club Interior',
        icon: 'business-outline',
        color: '#818CF8',
        gradient: ['#4F46E5', '#818CF8'],
        desc: 'Dance floor, bar, VIP lounge & entrance',
    },
    {
        key: 'events',
        label: 'Past Events',
        icon: 'images-outline',
        color: '#F59E0B',
        gradient: ['#D97706', '#F59E0B'],
        desc: 'Best nights — crowds, performances, moments',
    },
];

// ── PULSATING DOT ────────────────────────────────────────────────────────────
const PulsatingDot = ({ color = '#10B981', size = 8 }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={{
            width: size, height: size, borderRadius: size / 2, backgroundColor: color,
            opacity: pulseAnim,
            shadowColor: color, shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8, shadowRadius: 4, elevation: 4
        }} />
    );
};

// ── PREMIUM MEDIA THUMB ──────────────────────────────────────────────────────
const MediaThumb = React.memo(({ item, onRemove }: {
    item: any;
    onRemove: (id: string, name: string) => void;
}) => (
    <View style={styles.thumb}>
        <Image
            source={{ uri: item.url }}
            style={styles.thumbImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
        />
        <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'transparent', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFillObject}
            locations={[0, 0.4, 1]}
        />
        {/* LIVE pill */}
        <View style={styles.livePill}>
            <PulsatingDot color="#10B981" size={6} />
            <Text style={styles.liveText}>LIVE</Text>
        </View>
        {/* Delete button (Glassmorphism) */}
        <TouchableOpacity
            style={styles.deleteBtnWrapper}
            onPress={() => onRemove(item._id, item.fileName || 'this photo')}
            activeOpacity={0.8}
        >
            <BlurView intensity={40} tint="dark" style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={13} color="rgba(255,100,100,0.9)" />
            </BlurView>
        </TouchableOpacity>
    </View>
));

// ── UPLOAD TILE ──────────────────────────────────────────────────────────────
const UploadTile = ({ onPress, uploading, color, gradient }: {
    onPress: () => void;
    uploading: boolean;
    color: string;
    gradient: [string, string];
}) => (
    <TouchableOpacity
        style={[styles.thumb, styles.uploadTile, { borderColor: color + '40' }]}
        onPress={onPress}
        disabled={uploading}
        activeOpacity={0.7}
    >
        <LinearGradient
            colors={[color + '10', color + '03']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        {uploading ? (
            <View style={{ alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color={color} size="small" />
                <Text style={{ color, fontSize: 10, fontWeight: '700' }}>UPLOADING</Text>
            </View>
        ) : (
            <>
                <View style={[styles.uploadCircle, { backgroundColor: color + '15' }]}>
                    <Ionicons name="add" size={26} color={color} />
                </View>
                <Text style={[styles.uploadLabel, { color }]}>Add Photo</Text>
            </>
        )}
    </TouchableOpacity>
);

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function HostMediaUpload() {
    const goBack = useStrictBack('/(host)/dashboard');
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<Category>('interior');
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchGallery = useCallback(async () => {
        try {
            const res = await hostService.getMedia();
            if (res.success) setMediaList(res.data || []);
        } catch {
            showToast('Failed to load gallery', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useFocusEffect(useCallback(() => { fetchGallery(); }, [fetchGallery]));

    const interiorMedia = mediaList.filter(m => m.category === 'interior' || !m.category);
    const eventsMedia   = mediaList.filter(m => m.category === 'events');
    const counts = { interior: interiorMedia.length, events: eventsMedia.length };

    const currentMedia = activeTab === 'interior' ? interiorMedia : eventsMedia;
    const currentTab   = TABS.find(t => t.key === activeTab)!;

    const handlePickAndUpload = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 8,
            quality: 0.85,
        });

        if (result.canceled || !result.assets?.length) return;

        setUploading(true);
        let successCount = 0;

        try {
            for (const asset of result.assets) {
                try {
                    const cloudUrl = await uploadImage(asset.uri);
                    await hostService.uploadMedia({
                        url: cloudUrl,
                        type: 'image',
                        category: activeTab,
                        fileName: `${activeTab}_${Date.now()}.jpg`,
                    });
                    successCount++;
                } catch { /* continue */ }
            }

            if (successCount > 0) {
                showToast(`${successCount} photo${successCount > 1 ? 's' : ''} live instantly ✅`, 'success');
                await fetchGallery();
            } else {
                showToast('Upload failed. Try again.', 'error');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (id: string, name: string) => {
        Alert.alert('Remove Photo', `Delete this photo from your club's profile?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await hostService.removeMedia(id);
                        if (res.success) {
                            setMediaList(prev => prev.filter(m => m._id !== id));
                            showToast('Photo removed', 'success');
                        }
                    } catch { showToast('Failed to remove photo', 'error'); }
                }
            }
        ]);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* HEADER */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()} activeOpacity={0.7}>
                    <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                    <Ionicons name="chevron-back" size={20} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Media Gallery</Text>
                    <Text style={styles.headerSub}>
                        {loading ? 'Loading...' : `${mediaList.length} photos live`}
                    </Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* STATS ROW */}
                <View style={styles.statsRow}>
                    <StatCard label="Club Interior" count={counts.interior} color="#818CF8" />
                    <StatCard label="Past Events" count={counts.events} color="#F59E0B" />
                    <StatCard label="Total Exposure" count={mediaList.length} color="#10B981" />
                </View>

                {/* PREMIUM SEGMENTED CONTROL */}
                <View style={styles.tabContainer}>
                    {TABS.map(tab => {
                        const active = activeTab === tab.key;
                        const count = counts[tab.key];
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={styles.tabWrapper}
                                onPress={() => setActiveTab(tab.key)}
                                activeOpacity={0.8}
                            >
                                {active && (
                                    <View style={[StyleSheet.absoluteFill, styles.activeTabBg]}>
                                        <LinearGradient
                                            colors={tab.gradient}
                                            style={[StyleSheet.absoluteFillObject, { opacity: 0.15 }]}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        />
                                        <View style={[styles.activeTabGlow, { backgroundColor: tab.color }]} />
                                    </View>
                                )}
                                <View style={styles.tabContent}>
                                    <Ionicons name={tab.icon} size={16} color={active ? tab.color : 'rgba(255,255,255,0.4)'} />
                                    <Text style={[styles.tabLabel, active && { color: 'white' }]}>{tab.label}</Text>
                                    <View style={[styles.tabBadge, { backgroundColor: active ? tab.color + '30' : 'rgba(255,255,255,0.1)' }]}>
                                        <Text style={[styles.tabBadgeText, { color: active ? tab.color : 'rgba(255,255,255,0.5)' }]}>{count}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* BANNER */}
                <View style={[styles.banner, { borderColor: currentTab.color + '30' }]}>
                    <LinearGradient
                        colors={[currentTab.color + '15', currentTab.color + '05', 'transparent']}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    />
                    <View style={[styles.bannerIconBox, { backgroundColor: currentTab.color + '20' }]}>
                        <Ionicons name={currentTab.icon} size={20} color={currentTab.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.bannerTitle, { color: 'white' }]}>{currentTab.label}</Text>
                        <Text style={styles.bannerDesc}>{currentTab.desc}</Text>
                    </View>
                </View>

                {/* LIVE BAR */}
                <View style={styles.liveBar}>
                    <View style={styles.liveBarContent}>
                        <PulsatingDot color="#10B981" size={8} />
                        <Text style={styles.liveBarText}>Photos uploaded here are instantly live on your venue page.</Text>
                    </View>
                </View>

                {/* GRID */}
                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={currentTab.color} size="large" />
                        <Text style={styles.loadingText}>Fetching high-res media...</Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        <UploadTile
                            onPress={handlePickAndUpload}
                            uploading={uploading}
                            color={currentTab.color}
                            gradient={currentTab.gradient}
                        />

                        {currentMedia.map(item => (
                            <MediaThumb key={item._id} item={item} onRemove={handleRemove} />
                        ))}

                        {currentMedia.length === 0 && !uploading && (
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconBox, { borderColor: currentTab.color + '20', backgroundColor: currentTab.color + '05' }]}>
                                    <Ionicons name={activeTab === 'interior' ? 'camera-outline' : 'albums-outline'} size={46} color={currentTab.color + '80'} />
                                </View>
                                <Text style={styles.emptyTitle}>Your Gallery is Empty</Text>
                                <Text style={styles.emptyHint}>Showcase your {activeTab === 'interior' ? 'venue vibe' : 'best nights'} to attract more bookings.</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 60 }} />
            </ScrollView>
        </View>
    );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, count, color }: { label: string; count: number; color: string }) => (
    <View style={styles.statCard}>
        <LinearGradient colors={['rgba(255,255,255,0.03)', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <Text style={[styles.statNum, { color }]}>{count}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
    headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500', marginTop: 2 },

    scroll: { paddingHorizontal: 20, paddingTop: 10 },

    statsRow: {
        flexDirection: 'row', gap: 12, marginBottom: 24,
    },
    statCard: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0C0D10', borderRadius: 16,
        paddingVertical: 18, paddingHorizontal: 4,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    statNum: { fontSize: 28, fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
    statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    tabContainer: {
        flexDirection: 'row', backgroundColor: '#090A0C',
        borderRadius: 20, padding: 6, marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)',
    },
    tabWrapper: { flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative' },
    activeTabBg: { 
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    },
    activeTabGlow: {
        position: 'absolute', bottom: -1, left: '20%', right: '20%',
        height: 2, borderRadius: 2, opacity: 0.8,
        shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 3,
    },
    tabContent: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14,
    },
    tabLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
    tabBadge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    tabBadgeText: { fontSize: 11, fontWeight: '800' },

    banner: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        padding: 16, borderRadius: 20, borderWidth: 1,
        marginBottom: 16, overflow: 'hidden', backgroundColor: '#05050A',
    },
    bannerIconBox: {
        width: 48, height: 48, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    bannerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 2 },
    bannerDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500', lineHeight: 18 },
    
    liveBar: {
        marginBottom: 24,
    },
    liveBarContent: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: 'rgba(16,185,129,0.08)',
        borderRadius: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    },
    liveBarText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },

    thumb: {
        width: THUMB, height: THUMB * 1.25, // 4:5 aspect ratio looks more elegant
        borderRadius: 16, overflow: 'hidden',
        backgroundColor: '#0C0D10',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    thumbImg: { width: '100%', height: '100%' },
    livePill: {
        position: 'absolute', bottom: 8, left: 8,
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    liveText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    deleteBtnWrapper: {
        position: 'absolute', top: 6, right: 6,
        borderRadius: 12, overflow: 'hidden',
    },
    deleteBtn: {
        width: 28, height: 28,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },

    uploadTile: {
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderStyle: 'dashed', gap: 12,
    },
    uploadCircle: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
    },
    uploadLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

    emptyState: { 
        width: '100%', alignItems: 'center', paddingVertical: 60, gap: 16,
        paddingHorizontal: 20
    },
    emptyIconBox: {
        width: 80, height: 80, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    emptyHint: {
        color: 'rgba(255,255,255,0.4)', fontSize: 14,
        fontWeight: '500', textAlign: 'center', lineHeight: 20,
    },

    loadingBox: { width: '100%', alignItems: 'center', paddingVertical: 80, gap: 16 },
    loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },
});
