import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    TextInput, ScrollView, Animated, Platform,
    Dimensions, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumDateTimePicker } from '../../components/PremiumDateTimePicker';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { hostService } from '../../services/hostService';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#3b82f6', // Premium Blue
    primaryDark: '#1d4ed8',
    bg: '#000000', // Pitch Black
    card: '#050505',
    inputBg: '#080808',
    border: 'rgba(255, 255, 255, 0.08)',
    textWhite: '#FFFFFF',
    textDim: '#a0a0a0',
    success: '#10B981',
    glass: 'rgba(255, 255, 255, 0.02)',
};

export default function Onboarding() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { updateUser } = useAuth();
    const { showToast } = useToast();

    const [currentStep, setCurrentStep] = useState(1);
    const progress = useRef(new Animated.Value(25)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);

    // Form data
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [date, setDate] = useState(new Date(2000, 0, 1));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [location, setLocation] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [aadhaarFile, setAadhaarFile] = useState<any>(null);
    const [panFile, setPanFile] = useState<any>(null);

    useEffect(() => {
        let percent = 25;
        if (profileImage) percent += 25;
        if (aadhaarFile) percent += 25;
        if (panFile) percent += 25;
        
        Animated.spring(progress, {
            toValue: percent,
            useNativeDriver: false,
            bounciness: 4,
            speed: 10
        }).start();
    }, [profileImage, aadhaarFile, panFile]);

    const transitionToStep = React.useCallback((step: number) => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
        ]).start();
        setTimeout(() => setCurrentStep(step), 200);
    }, [fadeAnim]);

    const handlePickImage = React.useCallback(() => {
        Alert.alert(
            'Profile Photo',
            'Take a new photo or choose from your gallery.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Take Photo',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') return showToast('Camera permission required', 'error');
                            const result = await ImagePicker.launchCameraAsync({
                                allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true,
                            });
                            if (!result.canceled && result.assets?.[0]?.base64) {
                                setProfileImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
                            }
                        } catch (e) { showToast('Camera failed', 'error'); }
                    }
                },
                {
                    text: 'Choose Gallery',
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true,
                        });
                        if (!result.canceled && result.assets?.[0]?.base64) {
                            setProfileImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
                        }
                    }
                }
            ]
        );
    }, [showToast]);

    const handlePickDocument = React.useCallback((type: 'aadhaar' | 'pan') => {
        Alert.alert(
            `${type.toUpperCase()} Upload`,
            'Take a photo of your document or upload from gallery.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Take Photo',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') return showToast('Camera permission required', 'error');
                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ['images'], quality: 0.3, base64: true,
                            });
                            if (!result.canceled && result.assets?.[0]?.base64) {
                                const asset = result.assets[0];
                                const fileData = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
                                if (type === 'aadhaar') setAadhaarFile({ ...asset, base64: fileData });
                                else setPanFile({ ...asset, base64: fileData });
                                showToast(`${type.toUpperCase()} photo captured`, 'success');
                            }
                        } catch (e) { showToast('Camera failed', 'error'); }
                    }
                },
                {
                    text: 'Choose Gallery',
                    onPress: async () => {
                        try {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ['images'], quality: 0.3, base64: true,
                            });
                            if (!result.canceled && result.assets?.[0]?.base64) {
                                const asset = result.assets[0];
                                const fileData = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
                                if (type === 'aadhaar') setAadhaarFile({ ...asset, base64: fileData });
                                else setPanFile({ ...asset, base64: fileData });
                                showToast(`${type.toUpperCase()} photo selected`, 'success');
                            }
                        } catch (e) { showToast('Gallery failed', 'error'); }
                    }
                }
            ]
        );
    }, [showToast]);


    const detectLocation = React.useCallback(async () => {
        setIsDetectingLocation(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showToast('Permission to access location was denied', 'error');
                return;
            }
            let pos = await Location.getCurrentPositionAsync({});
            let address = await Location.reverseGeocodeAsync({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
            });
            if (address.length > 0) {
                const addr = address[0];
                setLocation(`${addr.city}, ${addr.region}`);
            }
        } catch (err) {
            showToast('Failed to detect location', 'error');
        } finally {
            setIsDetectingLocation(false);
        }
    }, [showToast]);

    const onDateChange = React.useCallback((selectedDate: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
            setDob(selectedDate.toLocaleDateString('en-GB'));
        }
    }, []);

    const handleSubmit = React.useCallback(async () => {
        console.log(`\n\n[SUBMIT LOG]======================================`);
        console.log(`[SUBMIT LOG] 1. Starting form validation...`);
        
        if (!name || !dob || !location) {
            console.log(`[SUBMIT LOG] ERROR: Basic details missing. name: ${!!name}, dob: ${!!dob}, location: ${!!location}`);
            return showToast('Please complete basic details', 'error');
        }
        if (!profileImage) {
            console.log(`[SUBMIT LOG] ERROR: Profile photo missing`);
            return showToast('Profile photo is required', 'error');
        }
        if (!aadhaarFile || !panFile) {
            console.log(`[SUBMIT LOG] ERROR: Govt ID missing. Aadhaar: ${!!aadhaarFile}, PAN: ${!!panFile}`);
            return showToast('All documents are required', 'error');
        }

        console.log(`[SUBMIT LOG] 2. Base Validation Passed!`);
        console.log(`[SUBMIT LOG] 3. Aadhaar Format Check - Base64 Length:`, aadhaarFile?.base64?.length);
        console.log(`[SUBMIT LOG] 4. PAN Format Check - Base64 Length:`, panFile?.base64?.length);
        
        setIsSubmitting(true);
        try {
            console.log(`[SUBMIT LOG] 5. Sending completeProfile request to hostService API...`);
            const payload = {
                name, dob, location, profileImage,
                aadhaarUrl: aadhaarFile.base64,
                panUrl: panFile.base64,
            };
            
            // Do not log base64 strings completely, they crash terminal
            console.log(`[SUBMIT LOG] 6. Payload structural mapping correct.`);
            
            const response = await hostService.completeProfile(payload);
            console.log(`[SUBMIT LOG] 7. API response received:`, response);
            
            if (response.success) {
                console.log(`[SUBMIT LOG] 8. Profile submission successful, updating context...`);
                await updateUser({ hostStatus: 'PENDING_VERIFICATION' });
                showToast('Verification request submitted!', 'success');
                router.replace('/(host)/success' as any);
            } else {
                console.error(`[SUBMIT LOG ERROR] Response not successful:`, response.message);
                showToast(response.message || 'Submission failed', 'error');
            }
        } catch (error: any) {
            console.error('\n\n[SUBMIT LOG CRASH]================================');
            console.error('[SUBMIT LOG CRASH] Exception:', error?.message || error);
            console.error('[SUBMIT LOG CRASH] Full stack:', error?.stack);
            console.error('[SUBMIT LOG CRASH]================================\n\n');
            showToast('Failed to submit profile', 'error');
        } finally {
            setIsSubmitting(false);
            console.log(`[SUBMIT LOG]======================================\n\n`);
        }
    }, [name, dob, location, profileImage, aadhaarFile, panFile, showToast, updateUser]);

    const renderStep1 = () => (
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Professional details.</Text>
            <Text style={styles.subtitle}>Your profile details should match your legal documents for verification.</Text>
            
            <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full Name"
                    placeholderTextColor={COLORS.textDim}
                />
            </View>

            <TouchableOpacity 
                style={styles.inputContainer} 
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
            >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <Text style={[styles.input, !dob && { color: COLORS.textDim }]}>
                    {dob || "Date of Birth"}
                </Text>
                <Feather name="chevron-down" size={16} color={COLORS.textDim} />
            </TouchableOpacity>

            <PremiumDateTimePicker
                visible={showDatePicker}
                mode="date"
                initialDate={date}
                title="Select Date of Birth"
                onClose={() => setShowDatePicker(false)}
                onSelect={onDateChange}
                maxDate={new Date(new Date().getFullYear() - 18, 0, 1)}
            />

            <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Current City"
                    placeholderTextColor={COLORS.textDim}
                />
                <TouchableOpacity onPress={detectLocation} style={styles.locAction}>
                    {isDetectingLocation ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Feather name="navigation" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={[styles.mainBtn, (!name || !dob || !location) && styles.disabledBtn]}
                onPress={() => transitionToStep(2)}
                disabled={!name || !dob || !location}
            >
                <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={styles.gradient} start={{x:0, y:0}} end={{x:1, y:0}}>
                    <Text style={styles.btnText}>Next Step</Text>
                    <Ionicons name="chevron-forward" size={20} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderStep2 = () => (
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Partner Identity.</Text>
            <Text style={styles.subtitle}>A high-quality professional portrait is required for your official profile.</Text>
            
            <View style={styles.profileUploadBox}>
                <TouchableOpacity onPress={handlePickImage} activeOpacity={0.9} style={styles.avatarWrapper}>
                    <View style={styles.avatarBorder}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Feather name="user" size={50} color={COLORS.textDim} />
                                <View style={styles.plusIcon}>
                                    <Ionicons name="add" size={20} color="#FFF" />
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                <Text style={styles.uploadHint}>{profileImage ? 'Photo Updated' : 'Tap to capture profile photo'}</Text>
            </View>

            <View style={styles.footerBtns}>
                <TouchableOpacity style={styles.backBtn} onPress={() => transitionToStep(1)}>
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.mainBtn, { flex: 1, marginLeft: 12 }, !profileImage && styles.disabledBtn]}
                    onPress={() => transitionToStep(3)}
                    disabled={!profileImage}
                >
                    <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={styles.gradient} start={{x:0, y:0}} end={{x:1, y:0}}>
                        <Text style={styles.btnText}>Continue</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderStep3 = () => (
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Govt. ID Verification.</Text>
            <Text style={styles.subtitle}>Securely upload your identification for KYC compliance.</Text>
            
            <View style={styles.docGrid}>
                <TouchableOpacity 
                    style={[styles.docCard, aadhaarFile && styles.docCardActive]} 
                    onPress={() => {
                        console.log('\n[TAP EVENT] Aadhaar card clicked!');
                        handlePickDocument('aadhaar');
                    }}
                >
                    <View style={[styles.docStatusIcon, { backgroundColor: aadhaarFile ? `${COLORS.success}20` : 'rgba(255,255,255,0.05)' }]}>
                        <MaterialIcons name="badge" size={24} color={aadhaarFile ? COLORS.success : COLORS.textDim} />
                    </View>
                    <Text style={styles.docLabel}>Aadhaar Card</Text>
                    <Text style={styles.docSub}>{aadhaarFile ? 'Document Linked' : 'Required'}</Text>
                    {aadhaarFile && <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.checkIcon} />}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.docCard, panFile && styles.docCardActive]} 
                    onPress={() => {
                        console.log('\n[TAP EVENT] PAN card clicked!');
                        handlePickDocument('pan');
                    }}
                >
                    <View style={[styles.docStatusIcon, { backgroundColor: panFile ? `${COLORS.success}20` : 'rgba(255,255,255,0.05)' }]}>
                        <MaterialIcons name="payment" size={24} color={panFile ? COLORS.success : COLORS.textDim} />
                    </View>
                    <Text style={styles.docLabel}>PAN Card</Text>
                    <Text style={styles.docSub}>{panFile ? 'Document Linked' : 'Required'}</Text>
                    {panFile && <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.checkIcon} />}
                </TouchableOpacity>
            </View>

            <View style={styles.footerBtns}>
                <TouchableOpacity style={styles.backBtn} onPress={() => transitionToStep(2)}>
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.submitBtn, { flex: 1, marginLeft: 12 }, (!aadhaarFile || !panFile || isSubmitting) && styles.disabledBtn]}
                    onPress={handleSubmit}
                    disabled={!aadhaarFile || !panFile || isSubmitting}
                >
                    {isSubmitting ? <ActivityIndicator color="#FFF" size="small" /> : (
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.gradient} start={{x:0, y:0}} end={{x:1, y:0}}>
                            <Text style={styles.btnText}>Finish Verification</Text>
                        </LinearGradient>
                    )}
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#050510', '#000']} style={StyleSheet.absoluteFill} />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <Animated.View style={[
                            styles.progressFill, 
                            { width: progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }
                        ]}>
                            <LinearGradient colors={['#60a5fa', '#3b82f6']} style={StyleSheet.absoluteFill} start={{x:0, y:0}} end={{x:1, y:0}} />
                        </Animated.View>
                    </View>
                    <Text style={styles.stepIndicator}>STEP {currentStep} OF 3</Text>
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scroll} 
                keyboardShouldPersistTaps="handled" 
                showsVerticalScrollIndicator={false}
            >
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 24, marginBottom: 20 },
    progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, flex: 1, marginRight: 16, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    stepIndicator: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    stepContent: { flex: 1 },
    title: { color: '#FFF', fontSize: 34, fontWeight: '900', marginBottom: 12, letterSpacing: -1 },
    subtitle: { color: COLORS.textDim, fontSize: 15, lineHeight: 22, marginBottom: 35, fontWeight: '500' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18, paddingHorizontal: 16, height: 64 },
    inputIcon: { marginRight: 15 },
    input: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '600' },
    locAction: { padding: 8, backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: 12 },
    mainBtn: { height: 64, borderRadius: 22, overflow: 'hidden', marginTop: 20 },
    submitBtn: { height: 64, borderRadius: 22, overflow: 'hidden' },
    gradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    btnText: { color: '#FFF', fontSize: 17, fontWeight: '800', marginRight: 8 },
    backBtn: { width: 64, height: 64, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center' },
    footerBtns: { flexDirection: 'row', marginTop: 'auto', paddingTop: 20 },
    profileUploadBox: { alignItems: 'center', marginVertical: 30 },
    avatarWrapper: { width: 200, height: 200, borderRadius: 100, padding: 8, backgroundColor: 'rgba(59, 130, 246, 0.08)' },
    avatarBorder: { flex: 1, borderRadius: 100, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.primary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    avatarImage: { width: '100%', height: '100%' },
    avatarPlaceholder: { alignItems: 'center' },
    plusIcon: { position: 'absolute', bottom: -5, right: -5, backgroundColor: COLORS.primary, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.bg },
    uploadHint: { color: COLORS.textDim, marginTop: 20, fontSize: 13, fontWeight: '600' },
    docGrid: { gap: 16, marginBottom: 30 },
    docCard: { backgroundColor: COLORS.inputBg, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.border, position: 'relative' },
    docCardActive: { borderColor: `${COLORS.success}40`, backgroundColor: 'rgba(16, 185, 129, 0.05)' },
    docStatusIcon: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    docLabel: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    docSub: { color: COLORS.textDim, fontSize: 12, marginTop: 4, fontWeight: '500' },
    checkIcon: { position: 'absolute', top: 24, right: 24 },
    disabledBtn: { opacity: 0.5 },
});
