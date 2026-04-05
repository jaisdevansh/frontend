import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    KeyboardAvoidingView, 
    Platform, 
    ScrollView, 
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { useStrictBack } from '../../hooks/useStrictBack';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditReview() {
    const params = useLocalSearchParams();
    const goBack = useStrictBack();
    const { showToast } = useToast();

    // In a real app, these come from params or API
    const targetName = (params.name as string) || 'Neon Noir Afterparty';
    const targetImage = (params.image as string) || 'https://images.unsplash.com/photo-1572297597525-2ab1eeb4113e?auto=format&fit=crop&q=80&w=800';
    
    const [rating, setRating] = useState<number>(Number(params.rating) || 5);
    const [vibe, setVibe] = useState<number>(Number(params.vibe) || 9);
    const [service, setService] = useState<number>(Number(params.service) || 8);
    const [music, setMusic] = useState<number>(Number(params.music) || 10);
    const [reviewText, setReviewText] = useState<string>((params.text as string)?.replace(/^"|"$/g, '') || '');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStarPress = useCallback((selectedRating: number) => {
        setRating(selectedRating);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            showToast('Review updated successfully!', 'success');
            setTimeout(() => {
                goBack();
            }, 500);
        } catch (error) {
            showToast('Failed to update review.', 'error');
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>EDIT REVIEW</Text>
                    <Text style={styles.headerSubtitle}>OCTOBER 24, 2023 • LOS ANGELES</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView 
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView 
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Target Display */}
                        <View style={styles.venueDisplay}>
                            <Image source={{ uri: targetImage }} style={styles.venueImage} contentFit="cover" />
                            <LinearGradient 
                                colors={['transparent', 'rgba(10,10,15,0.95)']} 
                                style={styles.venueGradient}
                            >
                                <View style={styles.vipTag}>
                                    <Text style={styles.vipTagText}>VIP ACCESS</Text>
                                </View>
                                <Text style={styles.targetName}>{targetName}</Text>
                            </LinearGradient>
                        </View>

                        {/* Stars */}
                        <Text style={styles.sectionTitleCenter}>Overall Experience</Text>
                        <View style={styles.ratingSection}>
                            <View style={styles.starsContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => handleStarPress(star)}>
                                        <Ionicons 
                                            name="star" 
                                            size={40} 
                                            color={star <= rating ? '#9D4EDD' : 'rgba(255,255,255,0.05)'} 
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.ratingHint}>Exceptional Night</Text>
                        </View>

                        {/* Sliders Container */}
                        <View style={styles.slidersContainer}>
                            <View style={styles.sliderRow}>
                                <View style={styles.sliderLabelRow}>
                                    <Text style={styles.sliderLabel}>Atmosphere & Vibe</Text>
                                    <Text style={styles.sliderValue}>{(vibe / 2).toFixed(1)}</Text>
                                </View>
                                <Slider
                                    style={styles.sliderElement}
                                    minimumValue={0}
                                    maximumValue={10}
                                    step={1}
                                    value={vibe}
                                    onValueChange={v => { setVibe(Math.round(v)); Haptics.selectionAsync(); }}
                                    minimumTrackTintColor="#9D4EDD"
                                    maximumTrackTintColor="rgba(255,255,255,0.05)"
                                    thumbTintColor="transparent"
                                />
                            </View>
                            <View style={styles.sliderRow}>
                                <View style={styles.sliderLabelRow}>
                                    <Text style={styles.sliderLabel}>Music Quality</Text>
                                    <Text style={styles.sliderValue}>{(music / 2).toFixed(1)}</Text>
                                </View>
                                <Slider
                                    style={styles.sliderElement}
                                    minimumValue={0}
                                    maximumValue={10}
                                    step={1}
                                    value={music}
                                    onValueChange={v => { setMusic(Math.round(v)); Haptics.selectionAsync(); }}
                                    minimumTrackTintColor="#9D4EDD"
                                    maximumTrackTintColor="rgba(255,255,255,0.05)"
                                    thumbTintColor="transparent"
                                />
                            </View>
                            <View style={styles.sliderRow}>
                                <View style={styles.sliderLabelRow}>
                                    <Text style={styles.sliderLabel}>Service & Hospitality</Text>
                                    <Text style={styles.sliderValue}>{(service / 2).toFixed(1)}</Text>
                                </View>
                                <Slider
                                    style={styles.sliderElement}
                                    minimumValue={0}
                                    maximumValue={10}
                                    step={1}
                                    value={service}
                                    onValueChange={v => { setService(Math.round(v)); Haptics.selectionAsync(); }}
                                    minimumTrackTintColor="#9D4EDD"
                                    maximumTrackTintColor="rgba(255,255,255,0.05)"
                                    thumbTintColor="transparent"
                                />
                            </View>
                        </View>

                        {/* Text */}
                        <Text style={styles.feedbackLabel}>Tell us more about your night</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Your detailed review..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                multiline
                                textAlignVertical="top"
                                value={reviewText}
                                onChangeText={setReviewText}
                                selectionColor="#9D4EDD"
                            />
                        </View>
                    </ScrollView>

                    {/* Footer Button */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
                            <Text style={styles.submitBtnText}>{isSubmitting ? 'UPDATING...' : 'UPDATE REVIEW'}</Text>
                            {!isSubmitting && <Ionicons name="caret-forward" size={16} color="#FFFFFF" />}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    iconBtn: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    headerSubtitle: {
        color: '#9D4EDD',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },
    venueDisplay: {
        height: 180,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 32,
        backgroundColor: '#16161E',
    },
    venueImage: {
        ...StyleSheet.absoluteFillObject,
    },
    venueGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
        justifyContent: 'flex-end',
        padding: 20,
    },
    vipTag: {
        backgroundColor: '#9D4EDD',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
    },
    vipTagText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    targetName: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
    },
    sectionTitleCenter: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
    },
    ratingSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    ratingHint: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '500',
    },
    slidersContainer: {
        backgroundColor: '#14141A',
        borderRadius: 24,
        padding: 24,
        gap: 24,
        marginBottom: 32,
    },
    sliderRow: {
        width: '100%',
    },
    sliderLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sliderLabel: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    sliderValue: {
        color: '#9D4EDD',
        fontSize: 13,
        fontWeight: '800',
    },
    sliderElement: {
        width: '100%',
        height: 16,
    },
    feedbackLabel: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
        marginLeft: 4,
    },
    inputWrapper: {
        backgroundColor: '#14141A',
        borderRadius: 24,
        padding: 20,
        height: 140,
    },
    textInput: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 24,
        height: '100%',
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 12,
        backgroundColor: '#0A0A0F',
    },
    submitBtn: {
        backgroundColor: '#9D4EDD',
        height: 60,
        borderRadius: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#9D4EDD',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    }
});
