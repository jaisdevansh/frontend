import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');

export default function StaffLoginScreen() {
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(0); // 0: Identifier, 1: OTP
    const [hint, setHint] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const insets = useSafeAreaInsets();
    const { login } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const handleSendOtp = async () => {
        if (!identifier) {
            showToast('Please enter your phone number or email', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await authService.sendOtp(identifier.trim().toLowerCase());
            if (res.success) {
                showToast(res.message, 'success');
                if (res.data?.hint) setHint(res.data.hint);
                setStep(1);
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to send OTP';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            showToast('Please enter the 6-digit OTP', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await authService.verifyOtp(identifier.trim().toLowerCase(), otp);
            if (res.success) {
                const roleLower = (res.data.role || '').toLowerCase();
                
                // Only allow non-regular-users through the staff portal
                if (!roleLower || roleLower === 'user') {
                    showToast('Access denied. This login is for staff, hosts, and admins only.', 'error');
                    setLoading(false);
                    return;
                }

                await login({
                    token: res.data.accessToken,
                    role: res.data.role,
                    hostId: res.data.hostId,
                    user: res.data,
                    onboardingCompleted: res.data.onboardingCompleted
                });
                showToast(`Welcome back, ${res.data.name}`, 'success');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Verification failed';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000000', '#1a1a2e', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.background}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}>
                    <TouchableOpacity onPress={() => step === 1 ? setStep(0) : router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="briefcase" size={40} color="#FFFFFF" />
                        </View>
                        <Text style={styles.title}>STAFF ACCESS</Text>
                        <Text style={styles.subtitle}>{step === 0 ? 'Enter your registered phone or email' : 'Enter the OTP sent to you'}</Text>
                        {step === 1 && hint && <Text style={styles.hintText}>Demo Code: {hint}</Text>}
                    </View>

                    <View style={styles.form}>
                        {step === 0 ? (
                            <>
                                <Input
                                    label="Phone or Email"
                                    placeholder="+91 1234567890 or staff@entryclub.com"
                                    value={identifier}
                                    onChangeText={setIdentifier}
                                    keyboardType="default"
                                    autoCapitalize="none"
                                />
                                <Button
                                    title={loading ? "Sending OTP..." : "Get OTP"}
                                    onPress={handleSendOtp}
                                    style={styles.loginButton}
                                    disabled={loading}
                                />
                            </>
                        ) : (
                            <>
                                <Input
                                    label="OTP Code"
                                    placeholder="123456"
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                                <Button
                                    title={loading ? "Verifying..." : "Confirm & Login"}
                                    onPress={handleVerifyOtp}
                                    style={styles.loginButton}
                                    disabled={loading}
                                />
                                <TouchableOpacity 
                                    style={{ marginTop: 20, alignItems: 'center' }} 
                                    onPress={() => setStep(0)}
                                    disabled={loading}
                                >
                                    <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Change Phone/Email</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={() => router.replace('/(auth)/login')}>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Standard member? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Login here</Text></Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.dark },
    background: { ...StyleSheet.absoluteFillObject },
    keyboardView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 40, flexGrow: 1 },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start', marginBottom: 24, marginTop: 12 },
    header: { alignItems: 'center', marginBottom: SPACING.xxl, marginTop: SPACING.md },
    iconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
    title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: 8, marginBottom: 8 },
    subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500', textAlign: 'center' },
    hintText: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '900',
        marginTop: 10,
        textAlign: 'center',
        textShadowColor: 'rgba(255, 215, 0, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    form: { width: '100%' },
    loginButton: { marginTop: SPACING.xl }
});
