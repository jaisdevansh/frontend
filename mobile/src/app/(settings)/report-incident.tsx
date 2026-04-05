import React, { useState, useMemo, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';

const CATEGORIES = [
    { id: '1', title: 'Harassment & Conduct', icon: 'hand-left-outline', color: '#FF4D4D' },
    { id: '2', title: 'Lost & Found', icon: 'search-outline', color: '#4D94FF' },
    { id: '3', title: 'Safety & Security', icon: 'shield-checkmark-outline', color: '#4DFF88' },
    { id: '4', title: 'Emergency', icon: 'flash-outline', color: '#FFCC00' },
    { id: '5', title: 'Billing Issue', icon: 'receipt-outline', color: '#994DFF' },
    { id: '6', title: 'Technical Bug', icon: 'bug-outline', color: COLORS.primary },
    { id: '7', title: 'Something Else', icon: 'ellipsis-horizontal-outline', color: '#AAAAAA' },
];

export default function ReportIncident() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { showToast } = useToast();
    
    // Flow State
    const [step, setStep] = useState(1); // 1: Category, 2: Form, 3: Success
    
    // Form Data
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isAnonymous, setIsAnonymous] = useState(false);
    
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (params?.type === 'bug') {
            setCategory('Technical Bug');
            setStep(2);
        }
    }, [params?.type]);

    const handleSelectCategory = useCallback((cat: string) => {
        setCategory(cat);
        setStep(2);
    }, []);

    const handlePickImage = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            const newImages = result.assets.map(asset => {
                if (asset.base64) {
                    const mimeType = asset.mimeType || 'image/jpeg';
                    return `data:${mimeType};base64,${asset.base64}`;
                }
                return asset.uri;
            });
            setImages(prev => [...prev, ...newImages]);
        }
    }, []);

    const removeImage = useCallback((index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            showToast('Please provide a title and description', 'error');
            return;
        }

        setLoading(true);
        try {
            // High-speed auto-resolve for context: If the user is at an event, associate it automatically
            let currentVenueId = null;
            try {
                const activeRes = await userService.getActiveEvent();
                if (activeRes.success && activeRes.data?.hostId?.venueProfile?._id) {
                    currentVenueId = activeRes.data.hostId.venueProfile._id;
                }
            } catch (e: any) {
                console.log('Location resolve skip:', e?.message || 'Unknown error');
            }

            const res = await userService.submitIncident({
                title,
                category,
                description,
                location,
                images,
                isAnonymous,
                venueId: currentVenueId,
                metadata: {
                    os: Platform.OS,
                    osVersion: Platform.Version,
                    device: Platform.OS === 'ios' ? 'Apple Device' : 'Android Device',
                    timestamp: new Date().toISOString()
                }
            });

            if (res.success) {
                setStep(3);
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to submit report', 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.headerSection}>
                <View style={styles.alertIconBox}>
                    <Ionicons name="warning" size={32} color="#FF4D4D" />
                </View>
                <Text style={styles.mainHeading}>Your Safety Matters</Text>
                <Text style={styles.subtext}>
                    Confidentially report any issues, concerns, or lost items. Our Trust & Safety team reviews all reports immediately.
                </Text>
            </View>

            <View style={styles.categoryContainer}>
                <Text style={styles.sectionLabel}>WHAT IS THIS REGARDING?</Text>
                {CATEGORIES.map((item) => (
                    <TouchableOpacity 
                        key={item.id} 
                        style={styles.categoryCard}
                        onPress={() => handleSelectCategory(item.title)}
                    >
                        <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                            <Ionicons name={item.icon as any} size={22} color={item.color} />
                        </View>
                        <Text style={styles.categoryTitle}>{item.title}</Text>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.helperFooter}>Select a category to continue</Text>
        </ScrollView>
    );

    const renderStep2 = () => (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.activeCategoryHeader}>
                    <Text style={styles.activeCategoryLabel}>REPORTING FOR</Text>
                    <Text style={styles.activeCategoryName}>{category}</Text>
                </View>

                {category === 'Technical Bug' && (
                    <View style={styles.techNotice}>
                        <Ionicons name="code-working" size={16} color={COLORS.primary} />
                        <Text style={styles.techNoticeText}>
                            For faster resolution of technical issues, you can also email 
                            <Text style={{ fontWeight: 'bold', color: COLORS.primary }}> devanshjais20@gmail.com</Text>
                        </Text>
                    </View>
                )}

                <View style={styles.formSection}>
                    <Text style={styles.inputLabel}>INCIDENT TITLE</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="Short summary of the issue"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={styles.inputLabel}>INCIDENT DETAILS</Text>
                    <View style={styles.textAreaWrapper}>
                        <TextInput 
                            style={styles.textArea}
                            placeholder="Please describe exactly what happened. Include dates, times, and any relevant people or venues involved..."
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            multiline
                            numberOfLines={6}
                            value={description}
                            onChangeText={setDescription}
                            maxLength={1000}
                        />
                        <Text style={styles.charCount}>{description.length}/1000</Text>
                    </View>

                    <Text style={styles.inputLabel}>LOCATION (OPTIONAL)</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 10 }} />
                        <TextInput 
                            style={styles.inputInner}
                            placeholder="Enter venue or location"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={location}
                            onChangeText={setLocation}
                        />
                    </View>

                    <Text style={styles.inputLabel}>UPLOAD IMAGES (OPTIONAL)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                        <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage}>
                            <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.uploadText}>Add</Text>
                        </TouchableOpacity>
                        {images.map((uri, idx) => (
                            <View key={idx} style={styles.imagePreviewWrapper}>
                                <Image source={{ uri }} style={styles.previewImage} />
                                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(idx)}>
                                    <Ionicons name="close" size={14} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.anonymousRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.anonTitle}>Report Anonymously</Text>
                            <Text style={styles.anonSubtext}>Your identity won't be revealed to venues.</Text>
                        </View>
                        <Switch 
                            value={isAnonymous}
                            onValueChange={setIsAnonymous}
                            trackColor={{ false: '#333', true: COLORS.primary }}
                        />
                    </View>

                    <View style={styles.confidentialNote}>
                        <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.confidentialText}>This report is strictly confidential and encrypted.</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Secure Report</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );

    const renderStep3 = () => (
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

                <Text style={styles.successHeading}>
                    {category === 'Technical Bug' ? 'Issue Reported' : 'Report Received'}
                </Text>
                <Text style={styles.successSubtext}>
                    {category === 'Technical Bug' 
                      ? 'Thank you for your feedback. Our development team (devanshjais20) has been notified and is looking into this bug.' 
                      : 'Thank you for keeping the nightlife safe. Your report is completely anonymous and our safety team is reviewing it now.'}
                </Text>

                {category !== 'Technical Bug' && (
                    <View style={styles.safetyBox}>
                        <View style={styles.safetyIconWrapper}>
                            <Ionicons name="shield-checkmark" size={16} color="#FF4D4D" />
                        </View>
                        <View style={styles.safetyTextFlow}>
                            <Text style={styles.safetyTitle}>Safety First</Text>
                            <Text style={styles.safetyBody}>Our moderators respond to high-priority flags within 15 minutes. We appreciate your vigilance.</Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.primaryReturnBtn}
                    onPress={() => router.replace('/(user)/profile')}
                >
                    <Text style={styles.primaryReturnBtnText}>Return to Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {step !== 3 && (
                <View style={styles.navHeader}>
                    <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>
                        {category === 'Technical Bug' ? 'Report an Issue' : 'Report an Incident'}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>
            )}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22 },
    navTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
    scrollContent: { paddingBottom: 40 },
    headerSection: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 32 },
    alertIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 77, 77, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    mainHeading: { color: 'white', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
    subtext: { color: 'rgba(255,255,255,0.4)', fontSize: 16, textAlign: 'center', lineHeight: 24 },
    categoryContainer: { paddingHorizontal: 20, gap: 12 },
    sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
    categoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    categoryTitle: { flex: 1, color: 'white', fontSize: 16, fontWeight: '600' },
    helperFooter: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', marginTop: 24 },
    
    // Form Styles
    activeCategoryHeader: { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: 'rgba(124, 77, 255, 0.05)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    activeCategoryLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    activeCategoryName: { color: 'white', fontSize: 18, fontWeight: '700', marginTop: 4 },
    formSection: { padding: 20, gap: 16 },
    inputLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', color: 'white', padding: 16, borderRadius: BORDER_RADIUS.default, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', fontSize: 15 },
    textAreaWrapper: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BORDER_RADIUS.default, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16 },
    textArea: { color: 'white', fontSize: 15, height: 120, textAlignVertical: 'top' },
    charCount: { alignSelf: 'flex-end', color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 16, borderRadius: BORDER_RADIUS.default, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    inputInner: { flex: 1, color: 'white', height: 50, fontSize: 15 },
    imageScroll: { flexDirection: 'row', marginTop: 8 },
    uploadBtn: { width: 80, height: 80, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    uploadText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginTop: 4 },
    imagePreviewWrapper: { width: 80, height: 80, marginRight: 12, position: 'relative' },
    previewImage: { width: 80, height: 80, borderRadius: 12 },
    removeImageBtn: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF4D4D', justifyContent: 'center', alignItems: 'center' },
    anonymousRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: BORDER_RADIUS.default, marginTop: 10 },
    anonTitle: { color: 'white', fontSize: 15, fontWeight: '600' },
    anonSubtext: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    confidentialNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
    confidentialText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
    submitBtn: { backgroundColor: 'white', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 24, marginHorizontal: 20 },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: 'black', fontSize: 16, fontWeight: '700' },

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
    primaryReturnBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
    techNotice: {
        marginHorizontal: 20,
        marginTop: 15,
        padding: 12,
        backgroundColor: 'rgba(124, 77, 255, 0.05)',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.1)',
    },
    techNoticeText: {
        flex: 1,
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        lineHeight: 18,
    }
});
