import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    ActivityIndicator,
    Platform
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';

export default function SupportEmail() {
    const router = useRouter();
    const { showToast } = useToast();
    
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Auto-populate name for 'Super Fast' UX
    React.useEffect(() => {
        userService.getProfile().then(res => {
            if (res.success && res.data.name) setName(res.data.name);
        }).catch(() => {});
    }, []);

    const handleSubmit = async () => {
        if (!name.trim() || !description.trim()) {
            showToast('Please provide your name and message', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await userService.submitSupportRequest({
                name,
                message: description,
                metadata: {
                    os: Platform.OS,
                    timestamp: new Date().toISOString()
                }
            });

            if (res.success) {
                console.log('✅ [Frontend] API Success Response Received! Moving to success screen.');
                setSubmitted(true);
                showToast('Support request sent to devanshjais20@gmail.com', 'success');
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to send support request', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successWrapper}>
                    <Ionicons name="mail-unread-outline" size={80} color="#4ade80" />
                    <Text style={styles.successTitle}>Request Sent!</Text>
                    <Text style={styles.successSub}>Thank you. Your inquiry has been sent to our support team at devanshjais20@gmail.com. We typically respond within 12 hours.</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Return to Help Center</Text>
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
                    <Text style={styles.headerTitle}>Email Support</Text>
                    <View style={{ width: 44 }} />
                </View>

                <KeyboardAwareScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid={true}
                    extraScrollHeight={250}
                >
                    <View style={styles.form}>
                        <Text style={styles.label}>YOUR NAME</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="How should we address you?"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={styles.label}>HOW CAN WE HELP?</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe your concern or question"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            multiline
                            numberOfLines={8}
                            value={description}
                            onChangeText={setDescription}
                        />

                        <View style={styles.infoBox}>
                            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.infoText}>Estimated response time: <Text style={{ color: '#4ade80' }}>12 Hours</Text></Text>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.submitText}>Send Support Ticket</Text>}
                    </TouchableOpacity>
                    
                    {/* Extra padding for keyboard */}
                    <View style={{ height: 100 }} />
                </KeyboardAwareScrollView>
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
    textArea: { height: 160, textAlignVertical: 'top' },
    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, marginTop: 4 },
    infoText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
    submitBtn: { backgroundColor: '#4ade80', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
    submitText: { color: 'black', fontSize: 17, fontWeight: '800' },
    successWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    successTitle: { color: 'white', fontSize: 28, fontWeight: '900', marginTop: 24 },
    successSub: { color: 'rgba(255,255,255,0.5)', fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 24 },
    backBtn: { marginTop: 40, borderBottomWidth: 1, borderBottomColor: '#4ade80' },
    backBtnText: { color: '#4ade80', fontSize: 16, fontWeight: '700' }
});
