import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import apiClient from '../../services/apiClient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const INCIDENT_TYPES = [
    { id: 'Harassment & Conduct', label: 'Harassment & Conduct', icon: 'hand-left-outline' },
    { id: 'Lost & Found', label: 'Lost & Found', icon: 'search-outline' },
    { id: 'Safety & Security', label: 'Safety & Security', icon: 'shield-half-outline' },
    { id: 'Emergency', label: 'Emergency', icon: 'flash-outline' },
    { id: 'Billing Issue', label: 'Billing Issue', icon: 'receipt-outline' },
    { id: 'Something Else', label: 'Something Else', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function ReportIncidentScreen() {
    const goBack = useStrictBack('/');
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handlePickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showToast('Permission required to access photos', 'error');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.6,
            base64: true,
        });

        if (!result.canceled && result.assets) {
            const newImgs = result.assets
                .filter(a => a.base64)
                .map(a => `data:image/jpeg;base64,${a.base64}`);
            setImages(prev => [...prev, ...newImgs].slice(0, 5)); // max 5 images
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedType) return showToast('Please select what this report is about.', 'error');
        if (!title.trim()) return showToast('Please add an incident title.', 'error');
        if (!description.trim() || description.trim().length < 10) return showToast('Please provide more details (min 10 characters).', 'error');

        Keyboard.dismiss();
        setSubmitting(true);
        try {
            const res = await apiClient.post('/user/report-incident', {
                category: selectedType,
                title: title.trim(),
                description: description.trim(),
                images,
            });
            if (res.data.success) {
                setSubmitted(true);
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to submit report. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ── SUCCESS SCREEN ──────────────────────────────────────
    if (submitted) {
        return (
            <View style={styles.successWrapper}>
                <View style={styles.successCard}>
                    <TouchableOpacity 
                        style={styles.closeIconBtn}
                        onPress={() => router.replace('/(user)/profile')}
                    >
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>

                    <View style={styles.successIconOuter}>
                        <View style={styles.successIconInner}>
                            <Ionicons name="checkmark" size={32} color="white" />
                        </View>
                    </View>

                    <Text style={styles.successHeading}>Report Received</Text>
                    <Text style={styles.successSubtext}>
                        Thank you for keeping the nightlife safe. Your report is <Text style={styles.highlightText}>completely anonymous</Text> and our safety team is reviewing it now.
                    </Text>

                    <View style={styles.safetyBox}>
                        <View style={styles.safetyIconWrapper}>
                            <Ionicons name="shield-checkmark" size={16} color="#FF4D4D" />
                        </View>
                        <View style={styles.safetyTextFlow}>
                            <Text style={styles.safetyTitle}>Safety First</Text>
                            <Text style={styles.safetyBody}>Our moderators respond to high-priority flags within 15 minutes. We appreciate your vigilance.</Text>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.primaryReturnBtn}
                        onPress={() => router.replace('/(user)/profile')}
                    >
                        <Text style={styles.primaryReturnBtnText}>Return to Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── MAIN FORM ────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Report an Incident</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {/* Hero */}
                        <View style={styles.heroSection}>
                            <View style={styles.iconGlow}>
                                <Ionicons name="warning" size={42} color="#FF3B30" />
                            </View>
                            <Text style={styles.heroTitle}>Your Safety Matters</Text>
                            <Text style={styles.heroSubtitle}>
                                Confidentially report any issues. Our Trust & Safety team reviews all reports immediately.
                            </Text>
                        </View>

                        {/* Category */}
                        <Text style={styles.sectionLabel}>WHAT IS THIS REGARDING?</Text>
                        <View style={styles.typesContainer}>
                            {INCIDENT_TYPES.map((type) => {
                                const isSelected = selectedType === type.id;
                                return (
                                    <TouchableOpacity
                                        key={type.id}
                                        style={[styles.typeCard, isSelected && styles.typeCardActive]}
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setSelectedType(type.id);
                                        }}
                                    >
                                        <View style={[styles.typeIconBox, isSelected && styles.typeIconBoxActive]}>
                                            <Ionicons
                                                name={type.icon as any}
                                                size={20}
                                                color={isSelected ? '#FF3B30' : 'rgba(255,255,255,0.4)'}
                                            />
                                        </View>
                                        <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                                            {type.label}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={20} color="#FF3B30" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Title */}
                        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>INCIDENT TITLE</Text>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Short summary of the issue..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                        />

                        {/* Description */}
                        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>INCIDENT DETAILS</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Please describe exactly what happened. Include dates, times, and any relevant people or venues involved..."
                                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                multiline
                                maxLength={1000}
                                value={description}
                                onChangeText={setDescription}
                            />
                            <Text style={styles.charCount}>{description.length}/1000</Text>
                        </View>

                        {/* Image Upload */}
                        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>ATTACH EVIDENCE (OPTIONAL)</Text>
                        <View style={styles.imageSection}>
                            {/* Add Button */}
                            {images.length < 5 && (
                                <TouchableOpacity style={styles.addImageBtn} onPress={handlePickImages} activeOpacity={0.7}>
                                    <View style={styles.addImageInner}>
                                        <Ionicons name="camera-outline" size={28} color="rgba(255,59,48,0.7)" />
                                        <Text style={styles.addImageText}>Add Photos</Text>
                                        <Text style={styles.addImageSub}>{images.length}/5</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {/* Previews */}
                            {images.map((uri, idx) => (
                                <View key={idx} style={styles.previewWrapper}>
                                    <Image source={{ uri }} style={styles.previewImg} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(idx)}>
                                        <Ionicons name="close" size={14} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        {/* Privacy Note */}
                        <View style={styles.privacyNote}>
                            <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.privacyText}>This report is strictly confidential and encrypted.</Text>
                        </View>
                    </ScrollView>

                    {/* Footer Submit */}
                    <View style={[styles.footer, { paddingBottom: insets.bottom || 24 }]}>
                        <TouchableOpacity
                            style={[
                                styles.submitBtn,
                                (!selectedType || !title.trim() || description.trim().length === 0 || submitting) && styles.submitBtnDisabled
                            ]}
                            activeOpacity={0.9}
                            onPress={handleSubmit}
                            disabled={!selectedType || !title.trim() || description.trim().length === 0 || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>Submit Secure Report</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.dark },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: 120 },
    heroSection: { alignItems: 'center', marginBottom: SPACING.xxl },
    iconGlow: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 59, 48, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.2)' },
    heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 8 },
    heroSubtitle: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACING.md },
    sectionLabel: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
    typesContainer: { gap: 10, marginBottom: SPACING.sm },
    typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg },
    typeCardActive: { backgroundColor: 'rgba(255, 59, 48, 0.08)', borderColor: 'rgba(255, 59, 48, 0.4)' },
    typeIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    typeIconBoxActive: { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
    typeLabel: { flex: 1, color: 'rgba(255, 255, 255, 0.7)', fontSize: 16, fontWeight: '600' },
    typeLabelActive: { color: '#FFFFFF' },
    titleInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: BORDER_RADIUS.lg, color: 'white', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
    inputWrapper: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md },
    input: { color: '#FFFFFF', fontSize: 15, minHeight: 140, textAlignVertical: 'top', lineHeight: 22 },
    charCount: { color: 'rgba(255, 255, 255, 0.3)', fontSize: 12, textAlign: 'right', marginTop: 8 },
    imageSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    addImageBtn: { width: 90, height: 90, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,59,48,0.3)', borderStyle: 'dashed', overflow: 'hidden' },
    addImageInner: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,59,48,0.05)', gap: 2 },
    addImageText: { color: 'rgba(255,59,48,0.8)', fontSize: 11, fontWeight: '700' },
    addImageSub: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
    previewWrapper: { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    previewImg: { width: 90, height: 90, borderRadius: 12 },
    removeBtn: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    privacyNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 6 },
    privacyText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
    footer: { backgroundColor: 'rgba(0, 0, 0, 0.97)', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    submitBtn: { height: 56, backgroundColor: '#FF3B30', borderRadius: 100, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    submitBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', shadowOpacity: 0, elevation: 0, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    // Success Screen
    successWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    successCard: { width: '100%', backgroundColor: '#0D0D12', borderRadius: 24, padding: 30, alignItems: 'center', position: 'relative', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    closeIconBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    
    successIconOuter: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255, 77, 77, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, marginTop: 10 },
    successIconInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF4D4D', justifyContent: 'center', alignItems: 'center' },
    
    successHeading: { color: 'white', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
    successSubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 30, paddingHorizontal: 10 },
    highlightText: { color: '#FF4D4D', fontWeight: '800' },
    
    safetyBox: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
    safetyIconWrapper: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255, 77, 77, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    safetyTextFlow: { flex: 1 },
    safetyTitle: { color: 'white', fontSize: 13, fontWeight: '700', marginBottom: 4 },
    safetyBody: { color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 16 },
    
    primaryReturnBtn: { width: '100%', height: 50, backgroundColor: '#FF4D4D', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    primaryReturnBtnText: { color: 'white', fontSize: 15, fontWeight: '800' }
});
