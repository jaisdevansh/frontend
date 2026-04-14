import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';

const MOOD_TAGS = ['🔥 Fire Night', '🎵 Banging Music', '🍸 Great Drinks', '💃 Crowd Was Lit', '🛋️ Comfy Seating', '👮 Good Security', '🌟 VIP Vibes', '📸 Instagrammable'];

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
    0: { label: 'TAP TO RATE', color: '#4B5563' },
    1: { label: 'TERRIBLE', color: '#EF4444' },
    2: { label: 'BAD', color: '#F97316' },
    3: { label: 'OKAY', color: '#EAB308' },
    4: { label: 'VERY GOOD', color: '#22C55E' },
    5: { label: 'OUTSTANDING', color: '#7C3AED' },
};

export default function WriteReview() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { showToast } = useToast();

    const targetName = (params.name as string) || 'This Event';
    const targetImage = (params.image as string) || '';
    const eventId = params.eventId as string;
    const hostId = params.hostId as string;

    const [starRating, setStarRating] = useState(0);
    const [vibeScore, setVibeScore] = useState(0);
    const [serviceScore, setServiceScore] = useState(0);
    const [musicScore, setMusicScore] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [reviewText, setReviewText] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Animated scale for stars
    const starScales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);

    const animateStar = useCallback((index: number) => {
        Animated.sequence([
            Animated.spring(starScales[index], { toValue: 1.4, useNativeDriver: true, speed: 50 }),
            Animated.spring(starScales[index], { toValue: 1, useNativeDriver: true, speed: 30 }),
        ]).start();
    }, [starScales]);

    const handleStarPress = useCallback((star: number) => {
        setStarRating(star);
        animateStar(star - 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [animateStar]);

    const toggleTag = useCallback((tag: string) => {
        Haptics.selectionAsync();
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    }, []);

    const ScoreSelector = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
        <View style={styles.scoreRow}>
            <View style={styles.scoreLabelRow}>
                <Text style={styles.scoreLabel}>{label}</Text>
                <Text style={[styles.scoreNum, { color: value > 0 ? COLORS.primary : '#4B5563' }]}>{value > 0 ? `${value}/5` : '–'}</Text>
            </View>
            <View style={styles.scoreDots}>
                {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                        key={n}
                        onPress={() => { onChange(n); Haptics.selectionAsync(); }}
                        style={[styles.scoreDot, n <= value && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                    >
                        {n <= value && <View style={styles.scoreDotInner} />}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const handleSubmit = async () => {
        if (starRating === 0) {
            showToast('⭐ Please give an overall star rating!', 'error');
            return;
        }
        if (!reviewText.trim()) {
            showToast('✍️ Write a few words about your night!', 'error');
            return;
        }

        setIsSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            const payload = {
                eventId: eventId || undefined,
                hostId: hostId || undefined,
                vibe:    Math.max(1, vibeScore    || starRating),
                service: Math.max(1, serviceScore || starRating),
                music:   Math.max(1, musicScore   || starRating),
                feedback: [
                    ...selectedTags,
                    reviewText.trim()
                ].filter(Boolean).join(' — '),
                isAnonymous,
            };

            // Always hit real API — backend handles gracefully if IDs missing
            await userService.submitReview(payload);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsSubmitted(true);
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Failed to post review. Please try again.';
            showToast(`❌ ${msg}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── SUCCESS STATE ───────────────────────────────────────────────────────
    if (isSubmitted) {
        const avgScore = ((vibeScore || starRating) + (serviceScore || starRating) + (musicScore || starRating)) / 3;
        
        return (
            <View style={styles.container}>
                <LinearGradient 
                    colors={['#0F0F2D', '#050510', '#0D0D1A']} 
                    style={StyleSheet.absoluteFill} 
                />
                
                {/* Mesh Glow Effects */}
                <View style={[styles.meshGlow, { top: -100, right: -100, backgroundColor: 'rgba(124,58,237,0.15)' }]} />
                <View style={[styles.meshGlow, { bottom: -100, left: -100, backgroundColor: 'rgba(59,130,246,0.1)' }]} />

                <SafeAreaView style={styles.safe}>
                    <View style={styles.successWrap}>
                        <View style={styles.iconContainer}>
                            <LinearGradient
                                colors={['#FFD700', '#7C3AED', '#000000']}
                                style={styles.successGlow}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="heart" size={64} color="#fff" />
                            </LinearGradient>
                            
                            {/* Elite Avg Badge */}
                            <View style={styles.avgBadge}>
                                <Text style={styles.avgBadgeText}>{avgScore.toFixed(1)}</Text>
                                <Ionicons name="star" size={10} color="#000" />
                            </View>
                        </View>

                        <Text style={styles.successTitle}>Thank You</Text>
                        <Text style={styles.successSub}>
                            Your contribution helps the <Text style={{ color: '#FFF', fontWeight: '900' }}>Entry Club</Text>{'\n'}stay curated for the elite.
                        </Text>

                        <View style={styles.successActions}>
                            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                                <LinearGradient colors={[COLORS.primary, '#3B82F6']} style={styles.doneBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    <Text style={styles.doneBtnText}>BACK TO BOOKINGS</Text>
                                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.highlightAction} 
                                onPress={() => {
                                    setIsSubmitted(false);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.6)" style={{ marginRight: 6 }} />
                                <Text style={styles.highlightText}>WANT TO ADD MORE?</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // ─── MAIN FORM ────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0D0D1A', '#050510']} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={styles.safe} edges={['top']}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Write a Review</Text>
                    <TouchableOpacity
                        onPress={() => { setIsAnonymous(a => !a); Haptics.selectionAsync(); }}
                        style={[styles.anonBtn, isAnonymous && styles.anonBtnActive]}
                    >
                        <Ionicons name={isAnonymous ? 'eye-off' : 'eye'} size={14} color={isAnonymous ? '#fff' : 'rgba(255,255,255,0.4)'} />
                        <Text style={[styles.anonText, isAnonymous && { color: '#fff' }]}>Anon</Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces
                    >
                        {/* Venue Card */}
                        <View style={styles.venueCard}>
                            <LinearGradient
                                colors={['rgba(124,58,237,0.15)', 'rgba(59,130,246,0.05)']}
                                style={styles.venueCardGrad}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                {targetImage ? (
                                    <Image source={{ uri: targetImage }} style={styles.venueImg} contentFit="cover" cachePolicy="memory-disk" />
                                ) : (
                                    <View style={[styles.venueImg, { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Ionicons name="business" size={28} color={COLORS.primary} />
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.venueName} numberOfLines={2}>{targetName}</Text>
                                    <Text style={styles.venueSubtitle}>How was your night? 🌙</Text>
                                </View>
                            </LinearGradient>
                        </View>

                        {/* Star Rating */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>OVERALL RATING</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => handleStarPress(star)} activeOpacity={0.7}>
                                        <Animated.View style={{ transform: [{ scale: starScales[star - 1] }] }}>
                                            <Ionicons
                                                name={star <= starRating ? 'star' : 'star-outline'}
                                                size={46}
                                                color={star <= starRating ? '#F59E0B' : 'rgba(255,255,255,0.12)'}
                                            />
                                        </Animated.View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={[styles.ratingLabel, { color: SCORE_LABELS[starRating].color }]}>
                                {SCORE_LABELS[starRating].label}
                            </Text>
                        </View>

                        {/* Score Breakdown */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>RATE THE DETAILS</Text>
                            <View style={styles.scoresCard}>
                                <ScoreSelector label="🎭 Vibe" value={vibeScore} onChange={setVibeScore} />
                                <View style={styles.scoreDivider} />
                                <ScoreSelector label="🙌 Service" value={serviceScore} onChange={setServiceScore} />
                                <View style={styles.scoreDivider} />
                                <ScoreSelector label="🎵 Music" value={musicScore} onChange={setMusicScore} />
                            </View>
                        </View>

                        {/* Mood Tags */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>WHAT STOOD OUT?</Text>
                            <View style={styles.tagsWrap}>
                                {MOOD_TAGS.map((tag) => {
                                    const active = selectedTags.includes(tag);
                                    return (
                                        <TouchableOpacity
                                            key={tag}
                                            onPress={() => toggleTag(tag)}
                                            style={[styles.tag, active && styles.tagActive]}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Detailed Review */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>YOUR STORY</Text>
                            <View style={styles.inputCard}>
                                <TextInput
                                    ref={textInputRef}
                                    style={styles.textInput}
                                    placeholder="Tell everyone what made this night special (or not)..."
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    multiline
                                    maxLength={500}
                                    textAlignVertical="top"
                                    value={reviewText}
                                    onChangeText={setReviewText}
                                    selectionColor={COLORS.primary}
                                    onFocus={() => {
                                        // Scroll to bottom when text input is focused
                                        setTimeout(() => {
                                            scrollViewRef.current?.scrollToEnd({ animated: true });
                                        }, 300);
                                    }}
                                />
                                <Text style={styles.charCount}>{reviewText.length}/500</Text>
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitBtn, (isSubmitting || starRating === 0) && { opacity: 0.5 }]}
                            onPress={handleSubmit}
                            activeOpacity={0.85}
                            disabled={isSubmitting || starRating === 0}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, '#3B82F6']}
                                style={styles.submitGrad}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.submitText}>POST REVIEW</Text>
                                        <Ionicons name="send" size={18} color="#fff" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Extra padding for keyboard */}
                        <View style={{ height: 300 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D1A' },
    safe: { flex: 1 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
    anonBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    anonBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    anonText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },

    // Scroll
    scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

    // Venue Card
    venueCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)' },
    venueCardGrad: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    venueImg: { width: 60, height: 60, borderRadius: 14 },
    venueName: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
    venueSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

    // Sections
    section: { marginBottom: 24 },
    sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 14 },

    // Stars
    starsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 12 },
    ratingLabel: { textAlign: 'center', fontSize: 11, fontWeight: '900', letterSpacing: 2 },

    // Score selectors
    scoresCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 20, gap: 16 },
    scoreRow: { gap: 10 },
    scoreLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    scoreLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
    scoreNum: { fontSize: 14, fontWeight: '900' },
    scoreDots: { flexDirection: 'row', gap: 10 },
    scoreDot: { width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
    scoreDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
    scoreDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

    // Tags
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tag: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tagActive: { backgroundColor: 'rgba(124,58,237,0.25)', borderColor: COLORS.primary },
    tagText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
    tagTextActive: { color: '#fff', fontWeight: '700' },

    // Text Input
    inputCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 16 },
    textInput: { color: '#fff', fontSize: 15, lineHeight: 24, minHeight: 120 },
    charCount: { color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'right', marginTop: 8 },

    // Submit
    submitBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 8 },
    submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 60 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },

    // Success
    successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    successGlow: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 32, shadowColor: '#7C3AED', shadowOpacity: 0.8, shadowRadius: 40, shadowOffset: { width: 0, height: 0 }, elevation: 20 },
    successTitle: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
    successSub: { color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 40 },
    doneBtn: { width: '100%', borderRadius: 20, overflow: 'hidden' },
    doneBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 58 },
    doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    highlightAction: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
    highlightText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
    meshGlow: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.6 },
    iconContainer: { position: 'relative', marginBottom: 32, alignItems: 'center', justifyContent: 'center' },
    avgBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 2, borderColor: '#0D0D1A' },
    avgBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    successActions: { width: '100%', alignItems: 'center', marginTop: 40 },
});
