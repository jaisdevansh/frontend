import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { COLORS, SPACING } from '../../constants/design-system';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/Logo';
import auth from '@react-native-firebase/auth';
import { firebaseAuthHelper } from '../../services/firebaseAuthHelper';

export default function VerifyOtpScreen() {
    const { identifier, hint, type } = useLocalSearchParams<{ identifier: string, hint?: string, type?: 'phone' | 'email' }>();
    const [currentHint, setCurrentHint] = useState(hint);
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);


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
            let res;
            if (type === 'phone') {
                const confirmation = firebaseAuthHelper.getConfirmation();
                if (!confirmation) {
                    throw new Error('Verification session expired. Please go back and try again.');
                }

                // ── 1. VERIFY OTP CLIENT-SIDE VIA FIREBASE ────────────────────────
                try {
                    await confirmation.confirm(otp);
                } catch (verifyError: any) {
                    // Fix for Android Automatic SMS Verification race condition:
                    // If Google Play Services auto-reads the SMS, the session is consumed instantly.
                    // When the user manually clicks verify, it throws 'auth/session-expired'.
                    // If the user is already logged in, we can safely ignore this error!
                    const currentUser = auth().currentUser;
                    if (!currentUser) {
                        throw verifyError;
                    }
                }

                // ── 2. GET THE FIREBASE ID TOKEN ──────────────────────────────────
                const currentUser = auth().currentUser;
                if (!currentUser) {
                    throw new Error('Failed to retrieve verified user.');
                }
                const idToken = await currentUser.getIdToken(true);

                // ── 3. SEND ID TOKEN TO BACKEND FOR JWT SESSION EXCHANGE ──────────
                res = await authService.verifyOtp(identifier!, undefined, idToken);
            } else {
                // ── EMAIL PATH: Verify via backend OTP database ──────────────────
                res = await authService.verifyOtp(identifier!, otp);
            }

            if (res.success) {
                await login({
                    token: res.data.accessToken,
                    refreshToken: res.data.refreshToken,
                    role: res.data.role,
                    hostId: res.data.hostId || undefined,
                    user: {
                        id: res.data.id,
                        _id: res.data.id,
                        name: res.data.name,
                        email: res.data.email,
                        profileImage: res.data.profileImage,
                    } as any,
                    onboardingCompleted: res.data.onboardingCompleted
                });
                showToast('Login successful! 🎉', 'success');
            }
        } catch (error: any) {
            console.error('[OTP Verification Error]', error);
            let message = 'Invalid OTP';
            if (error.code === 'auth/invalid-verification-code') {
                message = 'Incorrect OTP code. Please check and try again.';
            } else if (error.code === 'auth/session-expired') {
                message = 'OTP code expired. Please request a new one.';
            } else if (error.response?.data?.message) {
                message = error.response.data.message;
            } else if (error.message) {
                message = error.message;
            }
            showToast(message, 'error');
            setOtp('');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            if (type === 'phone') {
                const confirmation = await auth().signInWithPhoneNumber(identifier!);
                firebaseAuthHelper.setConfirmation(confirmation, identifier!);
                showToast('OTP code resent successfully via SMS', 'success');
            } else {
                const res = await authService.sendOtp(identifier!);
                if (res.success) {
                    if (res.data?.hint) setCurrentHint(res.data.hint);
                    showToast('OTP resent successfully', 'success');
                }
            }
        } catch (error: any) {
            console.error('[OTP Resend Error]', error);
            let message = 'Failed to resend OTP';
            if (error.code === 'auth/too-many-requests') {
                message = 'Too many requests. Please try again later.';
            } else if (error.message) {
                message = error.message;
            }
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
            <LinearGradient
                colors={['#000000', '#1a1a2e', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

                <KeyboardAwareScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    enableOnAndroid={true}
                    enableAutomaticScroll={true}
                    extraScrollHeight={150}
                    extraHeight={150}
                    keyboardOpeningTime={0}
                >
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
                </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.xl,
        paddingTop: 20,
        paddingBottom: 60,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 12,
        marginTop: 8,
    },
    header: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
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
        marginTop: 16,
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
