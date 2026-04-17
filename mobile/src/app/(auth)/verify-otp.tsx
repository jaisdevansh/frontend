import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/Logo';
const { height } = Dimensions.get('window');

export default function VerifyOtpScreen() {
    const { identifier, hint } = useLocalSearchParams<{ identifier: string, hint?: string }>();
    const [currentHint, setCurrentHint] = useState(hint);
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const insets = useSafeAreaInsets();
    const { login } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            showToast('Please enter a valid 6-digit OTP', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await authService.verifyOtp(identifier!, otp);
            if (res.success) {
                await login({
                    token: res.data.accessToken,
                    role: res.data.role,
                    hostId: res.data.hostId,
                    user: res.data,
                    onboardingCompleted: res.data.onboardingCompleted
                });
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Invalid OTP';
            showToast(message, 'error');
            setOtp('');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        try {
            const res = await authService.sendOtp(identifier!);
            if (res.success) {
                if (res.data?.hint) setCurrentHint(res.data.hint);
                showToast('OTP resent successfully', 'success');
            }
        } catch (error: any) {
            showToast('Failed to resend OTP', 'error');
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
            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                enableOnAndroid={true}
                extraScrollHeight={200}
                style={styles.keyboardView}
            >
                <View style={[styles.innerContent, { paddingTop: insets.top + 20 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={{ marginBottom: 20 }}>
                            <Logo size={80} showText={false} />
                        </View>
                        <Text style={styles.title} adjustsFontSizeToFit numberOfLines={1}>VERIFY ACCESS</Text>
                        <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
                        <Text style={styles.identifierText}>{identifier}</Text>
                        {currentHint && <Text style={styles.hintText}>Demo Code: {currentHint}</Text>}
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="One-Time Password"
                            placeholder="000000"
                            value={otp}
                            onChangeText={setOtp}
                            keyboardType="number-pad"
                            maxLength={6}
                        />

                         <Button
                            title="Verify & Enter"
                            onPress={handleVerifyOtp}
                            style={styles.verifyButton}
                            loading={loading}
                        />

                        <View style={styles.resendContainer}>
                            <Text style={styles.resendText}>Didn't receive the code? </Text>
                            <TouchableOpacity onPress={handleResendOtp}>
                                <Text style={styles.resendLink}>Resend OTP</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    innerContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: 40,
        flex: 1,
        minHeight: height - 100,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 24,
        marginTop: 12,
    },
    header: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xxl,
        marginTop: SPACING.md,
        width: '100%',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 10,
        marginBottom: SPACING.md,
        textAlign: 'center',
        width: '100%',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 4,
    },
    identifierText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    hintText: {
        color: '#FFD700', // Gold color for prominence
        fontSize: 14,
        fontWeight: '900',
        marginTop: 8,
        textAlign: 'center',
        textShadowColor: 'rgba(255, 215, 0, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    form: {
        width: '100%',
    },
    verifyButton: {
        marginTop: SPACING.xl,
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.xl,
    },
    resendText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        fontWeight: '500',
    },
    resendLink: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});
