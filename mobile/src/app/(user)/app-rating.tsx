import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import apiClient from '../../services/apiClient';
import * as StoreReview from 'expo-store-review';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function AppRatingScreen() {
    const goBack = useStrictBack('/(user)/profile');
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const scrollRef = useRef<ScrollView>(null);

    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleStarPress = (star: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRating(star);
        // Auto-scroll to feedback area after a short delay
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            return showToast('Please select a star rating.', 'error');
        }
        Keyboard.dismiss();
        setSubmitting(true);
        try {
            const res = await apiClient.post('/user/rate', { stars: rating, feedback });
            if (res.data.success) {
                showToast(res.data.message || 'Thank you for your feedback!', 'success');
                
                // Clear inputs immediately
                setRating(0);
                setFeedback('');
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to submit rating', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#030303', '#130e22', '#030303']}
                style={StyleSheet.absoluteFill}
            />
            {/* Background glowing orbs for premium feel */}
            <View style={[styles.orb, { top: -100, right: -100, backgroundColor: COLORS.primary }]} />
            <View style={[styles.orb, { bottom: height / 4, left: -100, backgroundColor: '#8A2BE2' }]} />

            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView 
                    style={styles.keyboardView} 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView 
                        ref={scrollRef}
                        contentContainerStyle={styles.scrollContent} 
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        
                        <View style={styles.heroSection}>
                            <View style={styles.iconWrapper}>
                                <LinearGradient
                                    colors={['rgba(124, 77, 255, 0.5)', 'rgba(124, 77, 255, 0.1)']}
                                    style={styles.iconCircle}
                                >
                                    <Ionicons name="phone-portrait" size={48} color="#FFFFFF" />
                                </LinearGradient>
                                <View style={styles.iconGlow} />
                            </View>
                        </View>

                        <BlurView intensity={40} tint="dark" style={styles.glassCard}>
                            <Text style={styles.heroTitle}>Rate Your App</Text>
                            <Text style={styles.heroSubtitle}>
                                Review about app
                            </Text>

                            <View style={styles.starsContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity 
                                        key={star} 
                                        onPress={() => handleStarPress(star)} 
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons 
                                            name={star <= rating ? "star" : "star-outline"} 
                                            size={44} 
                                            color={star <= rating ? "#FFD700" : "rgba(255,255,255,0.2)"} 
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {rating > 0 && (
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.feedbackInput}
                                        placeholder="Tell us more about your experience (optional)..."
                                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                        multiline
                                        maxLength={500}
                                        value={feedback}
                                        onChangeText={setFeedback}
                                        onFocus={() => {
                                            setTimeout(() => {
                                                scrollRef.current?.scrollToEnd({ animated: true });
                                            }, 300);
                                        }}
                                    />
                                </View>
                            )}

                            <TouchableOpacity 
                                style={[styles.submitBtnContainer, (submitting || rating === 0) && styles.disabledContainer]}
                                onPress={handleSubmit}
                                disabled={submitting || rating === 0}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#7c4dff', '#5a32fa']}
                                    start={{x: 0, y: 0}}
                                    end={{x: 1, y: 0}}
                                    style={styles.submitBtnGradient}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Submit App Review</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.cancelBtn}
                                onPress={() => goBack()}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.cancelText}>Maybe Later</Text>
                            </TouchableOpacity>
                        </BlurView>

                    </ScrollView>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    orb: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.15,
        elevation: 50,
        shadowColor: '#7c4dff',
        shadowRadius: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingBottom: 16,
        zIndex: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingBottom: 40,
        paddingTop: 20,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 30,
        zIndex: 10,
    },
    iconWrapper: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.4)',
        zIndex: 2,
    },
    iconGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        opacity: 0.5,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 40,
        elevation: 10,
        zIndex: 1,
    },
    glassCard: {
        width: '100%',
        borderRadius: 28,
        padding: SPACING.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    heroSubtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 32,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 32,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    feedbackInput: {
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: BORDER_RADIUS.lg,
        color: '#FFF',
        height: 140, // Changed from minHeight so it creates an internal scrollable bounds for long reviews
        padding: 16,
        paddingTop: 16,
        textAlignVertical: 'top',
        fontSize: 15,
    },
    submitBtnContainer: {
        width: '100%',
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    disabledContainer: {
        shadowOpacity: 0,
        elevation: 0,
        opacity: 0.6,
    },
    submitBtnGradient: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    cancelText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
    }
});
