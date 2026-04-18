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

const MOOD_TAGS = [
    { label: 'Fire Night', icon: 'flame' as const },
    { label: 'Banging Music', icon: 'musical-notes' as const },
    { label: 'Great Drinks', icon: 'wine' as const },
    { label: 'Crowd Was Lit', icon: 'people' as const },
    { label: 'Comfy Seating', icon: 'cafe' as const },
    { label: 'Good Security', icon: 'shield-checkmark' as const },
    { label: 'VIP Vibes', icon: 'star' as const },
    { label: 'Instagrammable', icon: 'camera' as const },
];

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
    0: { label: 'TAP TO RATE', color: '#4B5563' },
    1: { label: 'TERRIBLE', color: '#EF4444' },
    2: { label: 'BAD', color: '#F97316' },
    3: { label: 'OKAY', color: '#EAB308' },
    4: { label: 'VERY GOOD', color: '#22C55E' },
    5: { label: 'OUTSTANDING', color: '#7C3AED' },
};

const ScoreSelector = React.memo(({ icon, label, value, onChange }: { icon: any; label: string; value: number; onChange: (v: number) => void }) => (
    <View style={styles.scoreRow}>
        <View style={styles.scoreLabelRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={icon} size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.scoreLabel}>{label}</Text>
            </View>
            <Text style={[styles.scoreNum, { color: value > 0 ? '#3B82F6' : '#4B5563' }]}>{value > 0 ? `${value}/5` : '–'}</Text>
        </View>
        <View style={styles.scoreDots}>
            {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                    key={n}
                    onPress={() => { onChange(n); Haptics.selectionAsync(); }}
                    style={[styles.scoreDot, n <= value && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }]}
                    activeOpacity={0.7}
                >
                    {n <= value && <View style={styles.scoreDotInner} />}
                </TouchableOpacity>
            ))}
        </View>
    </View>
));

const TagItem = React.memo(({ tagObj, active, onToggle }: { tagObj: any; active: boolean; onToggle: (label: string) => void }) => (
    <TouchableOpacity
        onPress={() => onToggle(tagObj.label)}
        style={[styles.tag, active && styles.tagActive]}
        activeOpacity={0.7}
    >
        <Ionicons name={tagObj.icon} size={14} color={active ? '#fff' : 'rgba(255,255,255,0.5)'} />
        <Text style={[styles.tagText, active && styles.tagTextActive]}>{tagObj.label}</Text>
    </TouchableOpacity>
));

// ── Sonar pulse ring ─────────────────────────────────────────────────────────
const PulseRing = ({ delay, size }: { delay: number; size: number }) => {
    const scaleAnim   = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.55)).current;

    React.useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(scaleAnim,   { toValue: 2.5, duration: 2000, useNativeDriver: true }),
                    Animated.timing(opacityAnim, { toValue: 0,   duration: 2000, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(scaleAnim,   { toValue: 1,    duration: 0, useNativeDriver: true }),
                    Animated.timing(opacityAnim, { toValue: 0.55, duration: 0, useNativeDriver: true }),
                ]),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <Animated.View style={{
            position: 'absolute',
            width: size, height: size, borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: 'rgba(124,58,237,0.65)',
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
        }} />
    );
};

// ── Heartbeat wrapper ────────────────────────────────────────────────────────
const HeartBeat = ({ children }: any) => {
    const scale = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        const beat = Animated.loop(
            Animated.sequence([
                Animated.spring(scale, { toValue: 1.22, friction: 3, tension: 160, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1,    friction: 3, tension: 160, useNativeDriver: true }),
                Animated.delay(1100),
            ])
        );
        const t = setTimeout(() => beat.start(), 700);
        return () => { clearTimeout(t); beat.stop(); };
    }, []);

    return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
};

// ── Premium Success Screen ───────────────────────────────────────────────────
const SuccessScreen = ({ avgScore, onBack, onAddMore }: any) => {
    const entranceScale = useRef(new Animated.Value(0.3)).current;
    const fadeAnim      = useRef(new Animated.Value(0)).current;
    const titleFade     = useRef(new Animated.Value(0)).current;
    const titleSlide    = useRef(new Animated.Value(28)).current;
    const subFade       = useRef(new Animated.Value(0)).current;
    const subSlide      = useRef(new Animated.Value(18)).current;
    const btnFade       = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.spring(entranceScale, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
        Animated.sequence([
            Animated.delay(300),
            Animated.parallel([
                Animated.timing(titleFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(titleSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]),
            Animated.delay(80),
            Animated.parallel([
                Animated.timing(subFade,  { toValue: 1, duration: 450, useNativeDriver: true }),
                Animated.timing(subSlide, { toValue: 0, duration: 450, useNativeDriver: true }),
            ]),
            Animated.delay(100),
            Animated.timing(btnFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#07070F', '#000000']} style={StyleSheet.absoluteFill} />
            {/* Ambient glow blobs */}
            <View style={[styles.meshGlow, { top: -180, right: -120, backgroundColor: 'rgba(124,58,237,0.18)' }]} />
            <View style={[styles.meshGlow, { bottom: -120, left: -180, backgroundColor: 'rgba(59,130,246,0.10)' }]} />
            <View style={[styles.meshGlow, { top: '35%', left: -200, width: 300, height: 300, backgroundColor: 'rgba(255,200,0,0.04)' }]} />

            <SafeAreaView style={styles.safe}>
                <View style={styles.successWrap}>

                    {/* Heart + pulse rings */}
                    <Animated.View style={[styles.iconContainer, { opacity: fadeAnim, transform: [{ scale: entranceScale }] }]}>
                        <PulseRing size={120} delay={0} />
                        <PulseRing size={120} delay={900} />
                        <HeartBeat>
                            <LinearGradient
                                colors={['#FFD700', '#C084FC', '#7C3AED']}
                                style={styles.successGlow}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="heart" size={54} color="#fff" />
                            </LinearGradient>
                        </HeartBeat>
                        <View style={styles.avgBadgePremium}>
                            <Text style={styles.avgBadgeTextPremium}>{avgScore.toFixed(1)}</Text>
                            <Ionicons name="star" size={11} color="#FFD700" />
                        </View>
                    </Animated.View>

                    {/* Title */}
                    <Animated.Text style={[styles.successTitleText, { opacity: titleFade, transform: [{ translateY: titleSlide }] }]}>
                        Review Submitted
                    </Animated.Text>

                    {/* Subtitle */}
                    <Animated.Text style={[styles.successSubText, { opacity: subFade, transform: [{ translateY: subSlide }] }]}>
                        Your voice shapes{'\n'}<Text style={{ color: '#FFF', fontWeight: '800', letterSpacing: 0.5 }}>Entry Club</Text>
                        {'\n'}and helps the elite decide.
                    </Animated.Text>

                    {/* Score pill strip */}
                    <Animated.View style={[styles.scorePillRow, { opacity: subFade }]}>
                        {(['VIBE', 'OVERALL', 'MOOD'] as const).map((label) => (
                            <View key={label} style={styles.scorePill}>
                                <Text style={styles.scorePillNum}>{avgScore.toFixed(1)}</Text>
                                <Text style={styles.scorePillLabel}>{label}</Text>
                            </View>
                        ))}
                    </Animated.View>

                    {/* CTA */}
                    <Animated.View style={[styles.successActionsContainer, { opacity: btnFade }]}>
                        <TouchableOpacity style={styles.premiumDoneBtn} onPress={onBack} activeOpacity={0.85}>
                            <LinearGradient
                                colors={['#7C3AED', '#5B21B6']}
                                style={styles.premiumDoneBtnGrad}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="ticket-outline" size={18} color="#fff" />
                                <Text style={styles.premiumDoneBtnText}>BACK TO BOOKINGS</Text>
                                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.premiumHighlightAction} onPress={onAddMore} activeOpacity={0.6}>
                            <Ionicons name="create-outline" size={13} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.premiumHighlightText}>EDIT REVIEW</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </SafeAreaView>
        </View>
    );
};

export default function WriteReview() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { showToast } = useToast();

    const targetName  = (params.name as string)    || 'This Event';
    const targetImage = (params.image as string)   || '';
    const eventId     = params.eventId as string;
    const hostId      = params.hostId  as string;

    const [starRating,       setStarRating]       = useState(0);
    const [vibeScore,        setVibeScore]        = useState(0);
    const [serviceScore,     setServiceScore]     = useState(0);
    const [musicScore,       setMusicScore]       = useState(0);
    const [selectedTags,     setSelectedTags]     = useState<string[]>([]);
    const [reviewText,       setReviewText]       = useState('');
    const [isAnonymous,      setIsAnonymous]      = useState(false);
    const [isSubmitting,     setIsSubmitting]     = useState(false);
    const [isSubmitted,      setIsSubmitted]      = useState(false);
    const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
    const [isLoadingExisting,setIsLoadingExisting]= useState(true);
    const fetchedRef = useRef(false); // guard against double-call in React Strict Mode

    // On mount: check if user already reviewed this event
    React.useEffect(() => {
        if (!eventId) { setIsLoadingExisting(false); return; }
        if (fetchedRef.current) return; // already fetched — skip Strict Mode double-invoke
        fetchedRef.current = true;

        let isMounted = true;
        (async () => {
            try {
                const res = await userService.getMyReview(eventId);
                if (!isMounted) return; // component unmounted during await
                if (res?.success && res?.data) {
                    const r = res.data;
                    const KNOWN_TAGS = ['Fire Night','Banging Music','Great Drinks','Crowd Was Lit','Comfy Seating','Good Security','VIP Vibes','Instagrammable'];
                    const avgStar = Math.round(((r.scores?.vibe || 0) + (r.scores?.service || 0) + (r.scores?.music || 0)) / 3);
                    setExistingReviewId(r._id);
                    setStarRating(avgStar);
                    setVibeScore(r.scores?.vibe    || 0);
                    setServiceScore(r.scores?.service || 0);
                    setMusicScore(r.scores?.music   || 0);
                    setIsAnonymous(r.isAnonymous   || false);
                    if (r.feedback) {
                        const parts = (r.feedback as string).split(' — ');
                        setSelectedTags(parts.filter((p: string) => KNOWN_TAGS.includes(p)));
                        setReviewText(parts.filter((p: string) => !KNOWN_TAGS.includes(p)).join(' — '));
                    }
                }
            } catch (e) {
                // silent — new user with no review is a non-error state
            } finally {
                if (isMounted) setIsLoadingExisting(false);
            }
        })();

        return () => { isMounted = false; };
    }, [eventId]);

    const starScales   = useRef([1,2,3,4,5].map(() => new Animated.Value(1))).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef  = useRef<TextInput>(null);

    const animateStar = useCallback((index: number) => {
        Animated.sequence([
            Animated.spring(starScales[index], { toValue: 1.4, useNativeDriver: true, speed: 50 }),
            Animated.spring(starScales[index], { toValue: 1,   useNativeDriver: true, speed: 30 }),
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

    const handleSubmit = async () => {
        if (starRating === 0) { showToast('⭐ Please give an overall star rating!', 'error'); return; }
        if (!reviewText.trim()) { showToast('✍️ Write a few words about your experience!', 'error'); return; }

        setIsSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const feedback = [...selectedTags, reviewText.trim()].filter(Boolean).join(' — ');

        try {
            if (existingReviewId) {
                await userService.updateReview({
                    reviewId: existingReviewId,
                    vibe:    Math.max(1, vibeScore    || starRating),
                    service: Math.max(1, serviceScore || starRating),
                    music:   Math.max(1, musicScore   || starRating),
                    feedback, isAnonymous,
                });
            } else {
                await userService.submitReview({
                    eventId: eventId || undefined,
                    hostId:  hostId  || undefined,
                    vibe:    Math.max(1, vibeScore    || starRating),
                    service: Math.max(1, serviceScore || starRating),
                    music:   Math.max(1, musicScore   || starRating),
                    feedback, isAnonymous,
                });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsSubmitted(true);
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Failed to post review. Please try again.';
            showToast(`❌ ${msg}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── SUCCESS STATE ─────────────────────────────────────────────────────────
    if (isSubmitted) {
        const avgScore = ((vibeScore || starRating) + (serviceScore || starRating) + (musicScore || starRating)) / 3;
        return (
            <SuccessScreen
                avgScore={avgScore}
                onBack={() => router.push({ pathname: '/(user)/my-bookings', params: { tab: 'past' } })}
                onAddMore={() => { setIsSubmitted(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            />
        );
    }

    // ─── MAIN FORM ─────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0D0D1A', '#050510']} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={styles.safe} edges={['top']}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/(user)/my-bookings', params: { tab: 'past' } })} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{existingReviewId ? 'Edit Review' : 'Write a Review'}</Text>
                    <TouchableOpacity
                        onPress={() => { setIsAnonymous(a => !a); Haptics.selectionAsync(); }}
                        style={[styles.anonBtn, isAnonymous && styles.anonBtnActive]}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={isAnonymous ? 'eye-off' : 'eye'} size={14} color={isAnonymous ? '#000' : 'rgba(255,255,255,0.4)'} />
                        <Text style={[styles.anonText, isAnonymous && { color: '#000' }]}>Anon</Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                                    <Text style={styles.venueSubtitle}>How was your elite experience? ✨</Text>
                                </View>
                            </LinearGradient>
                        </View>

                        {/* Star Rating */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>OVERALL RATING</Text>
                            <View style={styles.starsRow}>
                                {[1,2,3,4,5].map((star) => (
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
                                <ScoreSelector icon="sparkles"      label="Vibe"    value={vibeScore}    onChange={setVibeScore} />
                                <View style={styles.scoreDivider} />
                                <ScoreSelector icon="people"        label="Service" value={serviceScore} onChange={setServiceScore} />
                                <View style={styles.scoreDivider} />
                                <ScoreSelector icon="musical-notes" label="Music"   value={musicScore}   onChange={setMusicScore} />
                            </View>
                        </View>

                        {/* Mood Tags */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>WHAT STOOD OUT?</Text>
                            <View style={styles.tagsWrap}>
                                {MOOD_TAGS.map((tagObj) => (
                                    <TagItem
                                        key={tagObj.label}
                                        tagObj={tagObj}
                                        active={selectedTags.includes(tagObj.label)}
                                        onToggle={toggleTag}
                                    />
                                ))}
                            </View>
                        </View>

                        {/* Story Text */}
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
                                    onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300)}
                                />
                                <Text style={styles.charCount}>{reviewText.length}/500</Text>
                            </View>
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                            style={[styles.submitBtn, (isSubmitting || starRating === 0) && { opacity: 0.5 }]}
                            onPress={handleSubmit}
                            activeOpacity={0.85}
                            disabled={isSubmitting || starRating === 0}
                        >
                            <LinearGradient colors={[COLORS.primary, '#3B82F6']} style={styles.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.submitText}>{existingReviewId ? 'UPDATE REVIEW' : 'POST REVIEW'}</Text>
                                        <Ionicons name={existingReviewId ? 'checkmark-done' : 'send'} size={18} color="#fff" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

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
    anonBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
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
    scoreDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
    scoreDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
    scoreDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

    // Tags
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
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

    // ── Success Screen ───────────────────────────────────────────────────────
    successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    successGlow: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', shadowColor: '#7C3AED', shadowOpacity: 0.9, shadowRadius: 40, shadowOffset: { width: 0, height: 0 }, elevation: 24 },
    successTitleText: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -0.5, marginBottom: 14, textAlign: 'center' },
    successSubText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 27, textAlign: 'center', marginBottom: 32, paddingHorizontal: 10 },

    // Score pills
    scorePillRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
    scorePill: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, minWidth: 72 },
    scorePillNum: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 2 },
    scorePillLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },

    // CTA Buttons
    successActionsContainer: { width: '100%', alignItems: 'center', gap: 4, paddingHorizontal: 12 },
    premiumDoneBtn: { width: '100%', borderRadius: 24, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 16 },
    premiumDoneBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 64 },
    premiumDoneBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
    premiumHighlightAction: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
    premiumHighlightText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },

    // Shared
    meshGlow: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.6 },
    iconContainer: { position: 'relative', marginBottom: 36, alignItems: 'center', justifyContent: 'center' },
    avgBadgePremium: { position: 'absolute', bottom: -8, right: -12, backgroundColor: '#0D0D1A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderColor: 'rgba(255,215,0,0.35)', shadowColor: '#000', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    avgBadgeTextPremium: { color: '#FFF', fontSize: 15, fontWeight: '900' },
});
