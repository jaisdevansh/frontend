import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, ActivityIndicator, Dimensions,
    Alert, StatusBar, Animated
} from 'react-native';
import { Image } from 'expo-image';
import { useStrictBack } from '../../hooks/useStrictBack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../context/ToastContext';
import { hostService } from '../../services/hostService';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { uploadImage } from '../../services/cloudinaryService';

const { width } = Dimensions.get('window');
const GAP = 10;
const THUMB = (width - 40 - GAP * 2) / 3;

type Category = 'interior' | 'events';

const TABS: {
    key: Category;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    gradient: [string, string];
    desc: string;
}[] = [
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

// ── PULSATING DOT ─────────────────────────────────────────────────────────────
const PulsatingDot = ({ color = '#10B981', size = 8 }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return (
        <Animated.View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: color, opacity: pulseAnim,
        }} />
    );
};

// ── SKELETON BLOCK ────────────────────────────────────────────────────────────
const Skeleton = ({ w, h, radius = 12 }: { w: number | string; h: number; radius?: number }) => {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.14] });
    return (
        <Animated.View style={{
            width: w as any, height: h, borderRadius: radius,
            backgroundColor: '#fff', opacity,
        }} />
    );
};

// ── SKELETON LOADING STATE ────────────────────────────────────────────────────
const GallerySkeleton = () => (
    <View style={{ gap: 16 }}>
        {/* Stats row skeleton */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
            {[0, 1, 2].map(i => (
                <View key={i} style={{ flex: 1, backgroundColor: '#0C0D10', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 8, alignItems: 'center' }}>
                    <Skeleton w={36} h={30} radius={8} />
                    <Skeleton w={60} h={10} radius={6} />
                </View>
            ))}
        </View>
        {/* Tab skeleton */}
        <Skeleton w="100%" h={56} radius={20} />
        {/* Banner skeleton */}
        <Skeleton w="100%" h={80} radius={20} />
        {/* Live bar skeleton */}
        <Skeleton w="100%" h={48} radius={14} />
        {/* Grid skeleton */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {[0, 1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} w={THUMB} h={THUMB * 1.25} radius={16} />
            ))}
        </View>
    </View>
);

// ── MEDIA THUMB ───────────────────────────────────────────────────────────────
const MediaThumb = React.memo(({ item, onRemove }: { item: any; onRemove: (id: string) => void }) => (
    <View style={styles.thumb}>
        <Image source={{ uri: item.url }} style={styles.thumbImg} contentFit="cover" cachePolicy="memory-disk" transition={300} />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFillObject} locations={[0.5, 1]} />
        <View style={styles.livePill}>
            <PulsatingDot color="#10B981" size={5} />
            <Text style={styles.liveText}>LIVE</Text>
        </View>
        <TouchableOpacity style={styles.deleteBtnWrapper} onPress={() => onRemove(item._id)} activeOpacity={0.8}>
            <BlurView intensity={40} tint="dark" style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={13} color="rgba(255,100,100,0.9)" />
            </BlurView>
        </TouchableOpacity>
    </View>
));

// ── UPLOAD TILE ───────────────────────────────────────────────────────────────
const UploadTile = ({ onPress, uploading, color, gradient }: {
    onPress: () => void; uploading: boolean; color: string; gradient: [string, string];
}) => (
    <TouchableOpacity style={[styles.thumb, styles.uploadTile, { borderColor: color + '50' }]} onPress={onPress} disabled={uploading} activeOpacity={0.75}>
        <LinearGradient colors={[color + '18', color + '06']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        {uploading ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={color} size="small" />
                <Text style={{ color, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>UPLOADING</Text>
            </View>
        ) : (
            <>
                <View style={[styles.uploadCircle, { backgroundColor: color + '20' }]}>
                    <Ionicons name="add" size={28} color={color} />
                </View>
                <Text style={[styles.uploadLabel, { color }]}>Add Photo</Text>
            </>
        )}
    </TouchableOpacity>
);

// ── STAT CARD ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, count, color, icon }: { label: string; count: number; color: string; icon: keyof typeof Ionicons.glyphMap }) => (
    <View style={styles.statCard}>
        <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.statNum, { color }]} numberOfLines={1} adjustsFontSizeToFit>{count}</Text>
        <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </View>
);

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function HostMediaUpload() {
    const goBack = useStrictBack('/(host)/dashboard');
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<Category>('interior');
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchGallery = useCallback(async () => {
        setLoading(true);
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
                        url: cloudUrl, type: 'image', category: activeTab,
                        fileName: `${activeTab}_${Date.now()}.jpg`,
                    });
                    successCount++;
                } catch { /* continue */ }
            }
            if (successCount > 0) {
                showToast(`${successCount} photo${successCount > 1 ? 's' : ''} live ✅`, 'success');
                await fetchGallery();
            } else {
                showToast('Upload failed. Try again.', 'error');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (id: string) => {
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
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* ── HEADER ── */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Media Gallery</Text>
                    <Text style={styles.headerSub}>
                        {loading ? 'Fetching your photos…' : `${mediaList.length} photo${mediaList.length !== 1 ? 's' : ''} live`}
                    </Text>
                </View>
                {/* Upload FAB in header */}
                <TouchableOpacity
                    style={[styles.uploadFab, { backgroundColor: currentTab.color + '20', borderColor: currentTab.color + '40' }]}
                    onPress={handlePickAndUpload}
                    disabled={uploading || loading}
                    activeOpacity={0.7}
                >
                    <Ionicons name="cloud-upload-outline" size={20} color={uploading ? 'rgba(255,255,255,0.3)' : currentTab.color} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <GallerySkeleton />
                ) : (
                    <>
                        {/* ── STATS ── */}
                        <View style={styles.statsRow}>
                            <StatCard label="Interior" count={counts.interior} color="#818CF8" icon="business-outline" />
                            <StatCard label="Events" count={counts.events} color="#F59E0B" icon="images-outline" />
                            <StatCard label="Total" count={mediaList.length} color="#10B981" icon="layers-outline" />
                        </View>

                        {/* ── TABS ── */}
                        <View style={styles.tabContainer}>
                            {TABS.map(tab => {
                                const active = activeTab === tab.key;
                                return (
                                    <TouchableOpacity
                                        key={tab.key}
                                        style={styles.tabWrapper}
                                        onPress={() => setActiveTab(tab.key)}
                                        activeOpacity={0.8}
                                    >
                                        {active && (
                                            <LinearGradient
                                                colors={[tab.color + '25', tab.color + '10']}
                                                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            />
                                        )}
                                        <View style={styles.tabContent}>
                                            <Ionicons name={tab.icon} size={15} color={active ? tab.color : 'rgba(255,255,255,0.35)'} />
                                            <Text style={[styles.tabLabel, active && { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit>{tab.label}</Text>
                                            <View style={[styles.tabBadge, { backgroundColor: active ? tab.color + '30' : 'rgba(255,255,255,0.08)' }]}>
                                                <Text style={[styles.tabBadgeText, { color: active ? tab.color : 'rgba(255,255,255,0.4)' }]}>{counts[tab.key]}</Text>
                                            </View>
                                        </View>
                                        {active && (
                                            <View style={[styles.activeUnderline, { backgroundColor: tab.color }]} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* ── BANNER ── */}
                        <View style={[styles.banner, { borderColor: currentTab.color + '25' }]}>
                            <LinearGradient
                                colors={[currentTab.color + '18', 'transparent']}
                                style={StyleSheet.absoluteFillObject}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            />
                            <View style={[styles.bannerIconBox, { backgroundColor: currentTab.color + '20' }]}>
                                <Ionicons name={currentTab.icon} size={22} color={currentTab.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.bannerTitle}>{currentTab.label}</Text>
                                <Text style={styles.bannerDesc}>{currentTab.desc}</Text>
                            </View>
                        </View>

                        {/* ── LIVE BAR ── */}
                        <View style={styles.liveBar}>
                            <PulsatingDot color="#10B981" size={8} />
                            <Text style={styles.liveBarText}>Photos are instantly live on your venue page.</Text>
                        </View>

                        {/* ── GRID / EMPTY ── */}
                        {currentMedia.length === 0 && !uploading ? (
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconBox, { borderColor: currentTab.color + '25', backgroundColor: currentTab.color + '08' }]}>
                                    <Ionicons name={activeTab === 'interior' ? 'camera-outline' : 'albums-outline'} size={44} color={currentTab.color + '90'} />
                                </View>
                                <Text style={styles.emptyTitle}>No Photos Yet</Text>
                                <Text style={styles.emptyHint}>
                                    {activeTab === 'interior'
                                        ? 'Show guests the vibe — upload your venue interior.'
                                        : 'Relive the best nights — upload your event photos.'}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.emptyUploadBtn, { backgroundColor: currentTab.color + '18', borderColor: currentTab.color + '35' }]}
                                    onPress={handlePickAndUpload}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="cloud-upload-outline" size={18} color={currentTab.color} />
                                    <Text style={[styles.emptyUploadText, { color: currentTab.color }]}>Upload First Photo</Text>
                                </TouchableOpacity>
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
                            </View>
                        )}
                    </>
                )}
                <View style={{ height: 80 }} />
            </ScrollView>
        </View>
    );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
    headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500', marginTop: 2 },
    uploadFab: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },

    scroll: { paddingHorizontal: 16, paddingTop: 20 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0B0C0F', borderRadius: 18,
        paddingVertical: 16, paddingHorizontal: 4,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 6,
    },
    statIconBox: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 2,
    },
    statNum: { fontSize: 26, fontWeight: '800', letterSpacing: -1 },
    statLabel: { color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Tabs
    tabContainer: {
        flexDirection: 'row', backgroundColor: '#0A0B0E',
        borderRadius: 18, padding: 5, marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    },
    tabWrapper: { flex: 1, borderRadius: 14, overflow: 'hidden', position: 'relative' },
    tabContent: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12,
    },
    tabLabel: { color: 'rgba(255,255,255,0.38)', fontSize: 13, fontWeight: '700' },
    tabBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
    tabBadgeText: { fontSize: 11, fontWeight: '800' },
    activeUnderline: {
        position: 'absolute', bottom: 0, left: '25%', right: '25%',
        height: 2, borderRadius: 2,
    },

    // Banner
    banner: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        padding: 16, borderRadius: 18, borderWidth: 1,
        marginBottom: 12, overflow: 'hidden',
        backgroundColor: '#06070A',
    },
    bannerIconBox: {
        width: 46, height: 46, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    bannerTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 3 },
    bannerDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '500', lineHeight: 17 },

    // Live bar
    liveBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 14, paddingVertical: 11,
        backgroundColor: 'rgba(16,185,129,0.07)',
        borderRadius: 13, borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)',
        marginBottom: 20,
    },
    liveBarText: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '500', flex: 1 },

    // Grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    thumb: {
        width: THUMB, height: THUMB * 1.3,
        borderRadius: 14, overflow: 'hidden',
        backgroundColor: '#0C0D10',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    thumbImg: { width: '100%', height: '100%' },
    livePill: {
        position: 'absolute', bottom: 7, left: 6,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3,
    },
    liveText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    deleteBtnWrapper: { position: 'absolute', top: 6, right: 6, borderRadius: 10, overflow: 'hidden' },
    deleteBtn: {
        width: 28, height: 28,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },

    // Upload tile
    uploadTile: {
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderStyle: 'dashed', gap: 10,
    },
    uploadCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    uploadLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

    // Empty
    emptyState: { alignItems: 'center', paddingVertical: 50, gap: 14 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    emptyTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
    emptyHint: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
    emptyUploadBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 22, paddingVertical: 13,
        borderRadius: 14, borderWidth: 1, marginTop: 4,
    },
    emptyUploadText: { fontSize: 14, fontWeight: '700' },
});
