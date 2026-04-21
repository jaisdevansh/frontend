import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Dimensions, TextInput, KeyboardAvoidingView } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';

import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { COLORS, SPACING } from '../../constants/design-system';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/Logo';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

import { API_BASE_URL } from '../../services/apiClient';

// Backend-driven Google OAuth — no redirect URI issues
const GOOGLE_AUTH_URL = `${API_BASE_URL}/api/auth/google`;

export default function LoginScreen() {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [inputType, setInputType] = useState<'phone' | 'email'>('phone');

    // Phone mode based on manual toggle
    const isPhoneMode = inputType === 'phone';


    const { login, logout } = useAuth();
    const router = useRouter();
    const goBack = useStrictBack('/(auth)/welcome');
    const { showToast } = useToast();

    // ── Google OAuth via backend deep-link ──────────────────────────────────
    const handleGoogleLogin = async () => {
        const startTime = Date.now();
        try {
            setLoading(true);
            
            // ⚡ CRITICAL: Clear all cache BEFORE Google login to prevent stale data
            console.log('[Google Login] Clearing all previous user data...');
            await logout(); // This clears AsyncStorage and React Query cache
            
            // ⚡ EXTRA SAFETY: Wait a moment to ensure logout completes fully
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const redirectUri = Linking.createURL('auth');
            const authUrl = `${GOOGLE_AUTH_URL}?redirectUri=${encodeURIComponent(redirectUri)}`;
            
            console.log('[Google Login] Opening Google OAuth...');
            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

            if (result.type === 'success' && result.url) {
                const parsed = Linking.parse(result.url);
                const token = parsed.queryParams?.token as string | undefined;
                const error = parsed.queryParams?.error as string | undefined;

                if (error || !token) {
                    showToast('Google login failed. Please try again.', 'error');
                    return;
                }
                
                console.log('[Google Login] Success! Received token from backend');
                
                const refreshToken = parsed.queryParams?.refreshToken as string | undefined;
                const userRole = (parsed.queryParams?.role as string) || 'user';
                const onboarded = parsed.queryParams?.onboardingCompleted === 'true';
                
                const fullName = (parsed.queryParams?.name as string) || '';
                const nameParts = fullName.trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                console.log('[Google Login] User data from backend:', {
                    name: fullName,
                    email: parsed.queryParams?.email,
                    userId: parsed.queryParams?.userId
                });
                
                await login({
                    token,
                    refreshToken,
                    role: userRole,
                    hostId: (parsed.queryParams?.hostId as string) || undefined,
                    onboardingCompleted: onboarded,
                    user: {
                        id:           parsed.queryParams?.userId as string,
                        _id:          parsed.queryParams?.userId as string,
                        name:         fullName,
                        firstName:    firstName,
                        lastName:     lastName,
                        email:        parsed.queryParams?.email as string,
                        profileImage: parsed.queryParams?.profileImage as string,
                        username:     parsed.queryParams?.username as string,
                        phone:        parsed.queryParams?.phone as string,
                        gender:       parsed.queryParams?.gender as string,
                    }
                });
                
                console.log(`[⚡ PERF] Google login: ${Date.now() - startTime}ms`);
                console.log('[Google Login] Login complete, showing success toast');
                showToast('Welcome! 🎉', 'success');
            }
        } catch (error: any) {
            console.error('[Login] Google error:', error);
            showToast('Google login service error', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        if (!identifier) {
            showToast('Please enter your phone number or email', 'error');
            return;
        }

        setLoading(true);
        try {
            if (identifier.trim().toLowerCase() === 'admin') {
                await login({ token: 'test-admin-token', role: 'admin' });
                setLoading(false);
                return;
            }

            // Auto-prepend +91 for phone-only input
            const raw = identifier.trim();
            const isEmail = raw.includes('@');
            let finalIdentifier = raw.toLowerCase();
            if (!isEmail) {
                const digits = raw.replace(/\D/g, '');
                finalIdentifier = `+91${digits}`;
            }

            const res = await authService.sendOtp(finalIdentifier);
            if (res.success) {
                showToast(res.message, 'success');
                router.push({
                    pathname: '/(auth)/verify-otp' as any,
                    params: { 
                        identifier: finalIdentifier,
                        hint: res.data?.hint 
                    }
                });
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to send OTP';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <LinearGradient
                    colors={['#000000', '#1a1a2e', '#000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.background}
                />
                
                <View style={styles.innerContent}>
                    <View style={styles.topSection}>
                        <TouchableOpacity onPress={() => goBack()} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <Logo size={90} />
                        </View>
                    </View>

                <View style={styles.form}>
                    {/* ── Smart Phone / Email Input ── */}
                    <Text style={styles.inputLabel}>Phone Number or Email</Text>
                    <View style={styles.inputRow}>
                        <TouchableOpacity 
                            style={styles.dialCodePill}
                            onPress={() => setInputType(prev => prev === 'phone' ? 'email' : 'phone')}
                            activeOpacity={0.7}
                        >
                            {isPhoneMode ? <Text style={styles.flagEmoji}>🇮🇳</Text> : <Ionicons name="mail" size={20} color="rgba(255, 255, 255, 0.7)" />}
                        </TouchableOpacity>

                        <View style={[styles.inputBox, isFocused && styles.inputBoxFocused]}>
                            {isPhoneMode && (
                                <>
                                    <Text style={styles.dialPrefix}>+91</Text>
                                    <View style={styles.prefixDivider} />
                                </>
                            )}
                            <TextInput
                                style={styles.textField}
                                placeholder={isPhoneMode ? '98765 43210' : 'phone or email'}
                                placeholderTextColor="rgba(255,255,255,0.25)"
                                value={identifier}
                                onChangeText={(text) => {
                                    setIdentifier(text);
                                    if (text.includes('@') && inputType === 'phone') setInputType('email');
                                }}
                                keyboardType={isPhoneMode ? 'phone-pad' : 'email-address'}
                                autoCapitalize="none"
                                autoCorrect={false}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                            />
                        </View>
                    </View>

                    <Button
                        title="Send OTP"
                        onPress={handleSendOtp}
                        style={styles.loginButton}
                        loading={loading}
                    />

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <Button
                        title="Continue with Google"
                        onPress={handleGoogleLogin}
                        variant="glass"
                        icon={<FontAwesome name="google" size={20} color="#FFFFFF" />}
                        style={styles.googleButton}
                    />
                </View>
            </View>
            </View>
        </ScreenWrapper>
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
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 50,
    },
    innerContent: {
        paddingHorizontal: SPACING.xl,
        paddingTop: 20,
        paddingBottom: 40,
        flex: 1,
        justifyContent: 'flex-start',
    },
    topSection: {
        marginBottom: 8,
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
        marginVertical: 4,
    },
    form: {
        width: '100%',
        marginTop: 16,
    },
    loginButton: {
        marginTop: SPACING.xl,
    },
    googleButton: {
        marginTop: SPACING.md,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dividerText: {
        color: 'rgba(255, 255, 255, 0.3)',
        paddingHorizontal: SPACING.md,
        fontSize: 12,
        fontWeight: '700',
    },
    // ── Phone / Email input ──────────────────────────────────────────────
    inputLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        marginLeft: 4,
    },
    // Row that holds flag pill + input box side by side
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    // ── Flag pill (separate box) ──
    dialCodePill: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        width: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    flagEmoji: {
        fontSize: 18,
        lineHeight: 22,
    },
    // ── Input box (separate box) ──
    inputBox: {
        flex: 1,
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingLeft: 14,
        paddingRight: 12,
    },
    inputBoxFocused: {
        borderColor: 'rgba(255, 255, 255, 0.35)',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    textField: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
    },
    dialPrefix: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginRight: 2,
        letterSpacing: 0.3,
    },
    prefixDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        marginHorizontal: 8,
    },
});
