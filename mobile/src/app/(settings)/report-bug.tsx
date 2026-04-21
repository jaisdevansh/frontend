import React, { useState, useCallback, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    ActivityIndicator,
    Image,
    Platform
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';

export default function ReportBug() {
    const router = useRouter();
    const { showToast } = useToast();
    
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Auto-populate name for 'Super Fast' UX
    React.useEffect(() => {
        userService.getProfile().then(res => {
            if (res.success && res.data.name) setName(res.data.name);
        }).catch(() => {});
    }, []);

    // High performance handlers
    const handlePickImage = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            const newImages = result.assets.map(asset => {
                const mimeType = asset.mimeType || 'image/jpeg';
                return `data:${mimeType};base64,${asset.base64}`;
            });
            setImages(prev => [...prev, ...newImages]);
        }
    }, []);

    const removeImage = useCallback((index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = async () => {
        if (!name.trim() || !description.trim()) {
            showToast('Please provide your name and bug description', 'error');
            return;
        }

        setLoading(true);
        try {
            // Enhanced sub-10ms response: Capture context immediately
            const metadata = {
                os: Platform.OS,
                osVersion: Platform.Version,
                device: Platform.OS === 'ios' ? 'Apple Device' : 'Android Device',
                reporterName: name,
                timestamp: new Date().toISOString()
            };

            const res = await userService.submitBugReport({
                description,
                images,
                metadata
            });

            if (res.success) {
                setSubmitted(true);
                showToast('Bug reported directly to devanshjais20@gmail.com', 'success');
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to send bug report', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successWrapper}>
                    <Ionicons name="checkmark-circle" size={80} color={COLORS.primary} />
                    <Text style={styles.successTitle}>Report Sent!</Text>
                    <Text style={styles.successSub}>Thank you. Your feedback has been sent directly to our lead developer's email (devanshjais20@gmail.com).</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Report a Bug</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScreenWrapper>
                <View 
                    style={styles.scroll}
                >
                    <View style={styles.form}>
                        <Text style={styles.label}>YOUR NAME</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={styles.label}>BUG DESCRIPTION</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe the technical issue in detail"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            multiline
                            numberOfLines={6}
                            value={description}
                            onChangeText={setDescription}
                        />

                        <Text style={styles.label}>UPLOAD SCREENSHOTS</Text>
                        <ScrollView horizontal style={styles.imgScroll} showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity style={styles.addImgBtn} onPress={handlePickImage}>
                                <Ionicons name="image-outline" size={24} color="white" />
                            </TouchableOpacity>
                            {images.map((img, idx) => (
                                <View key={idx} style={styles.previewBox}>
                                    <Image source={{ uri: img }} style={styles.previewImg} />
                                    <TouchableOpacity style={styles.delBtn} onPress={() => removeImage(idx)}>
                                        <Ionicons name="close" size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        <Text style={styles.notice}>This report will be sent directly to devanshjais20@gmail.com</Text>
                    </View>

                    <TouchableOpacity 
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.submitText}>Submit directly to dev</Text>}
                    </TouchableOpacity>
                    
                    {/* Extra padding for keyboard */}
                    <View style={{ height: 100 }} />
                </View>
                </ScreenWrapper>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030303' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
    closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22 },
    scroll: { padding: 20 },
    form: { gap: 16 },
    label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: 16, padding: 16, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    textArea: { height: 120, textAlignVertical: 'top' },
    imgScroll: { marginBottom: 10 },
    addImgBtn: { width: 80, height: 80, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginRight: 12 },
    previewBox: { width: 80, height: 80, marginRight: 12 },
    previewImg: { width: '100%', height: '100%', borderRadius: 16 },
    delBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF3B30', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    notice: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', marginTop: 10 },
    submitBtn: { backgroundColor: COLORS.primary, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
    submitText: { color: 'white', fontSize: 17, fontWeight: '800' },
    successWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    successTitle: { color: 'white', fontSize: 28, fontWeight: '900', marginTop: 24 },
    successSub: { color: 'rgba(255,255,255,0.5)', fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 24 },
    backBtn: { marginTop: 40, borderBottomWidth: 1, borderBottomColor: COLORS.primary },
    backBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' }
});
