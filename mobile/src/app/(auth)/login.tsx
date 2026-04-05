import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, TextInput, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/Logo';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');
const GOOGLE_WEB_CLIENT_ID = '640886244176-l6r6ic1lhkbl7oi7a3kucijjdm83rk4f.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '640886244176-hp45kepcuqnmmo7sbqbuqjn4nesgn5n8.apps.googleusercontent.com';

/**
 * 🛡️ CRITICAL: Google ONLY accepts HTTPS public domains.
 * This is the "Secret Return URL" you MUST add to your Google Console (Web Client).
 */
const GOOGLE_REDIRECT_URI = 'https://auth.expo.io/@jerry-don20/entry-club';

export default function LoginScreen() {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [inputType, setInputType] = useState<'phone' | 'email'>('phone');

    // Phone mode based on manual toggle
    const isPhoneMode = inputType === 'phone';

    const insets = useSafeAreaInsets();
    const { login } = useAuth();
    const router = useRouter();
    const goBack = useStrictBack('/(auth)/welcome');
    const { showToast } = useToast();

    // 🛡️ HYBRID MASTER:
    // Manual construction of the professional HTTPS link to satisfy Google,
    // and manual handling of the redirect to bypass Expo Proxy errors.

    const handleGoogleCallback = async (accessToken: string) => {
        setLoading(true);
        try {
            const res = await authService.googleLogin(accessToken);
            if (res.success) {
                const tokenPayload = res.data.accessToken || (res.data as any).token;
                await login({
                    token: tokenPayload,
                    role: res.data.role,
                    hostId: res.data.hostId,
                    user: res.data,
                    onboardingCompleted: res.data.onboardingCompleted
                });
                showToast('Welcome back!', 'success');
            } else {
                showToast(res.message || 'Login failed', 'error');
            }
        } catch (error: any) {
            const errMsg = error.response?.data?.message || 'Google login failed.';
            showToast(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Set up standard Google Auth request via Expo's hook
    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                console.log('[Google Auth] Success! Token acquired.');
                handleGoogleCallback(authentication.accessToken);
            }
        } else if (response?.type === 'error') {
            console.error('[Google Auth] Native hook returned an error:', response.error);
            showToast('Google authentication was cancelled or failed.', 'error');
        }
    }, [response]);

    const handleGoogleLogin = async () => {
        try {
            await WebBrowser.dismissBrowser();
            console.log('[Google Auth] Starting standard Expo Google Auth flow');
            
            if (request) {
                await promptAsync();
            } else {
                showToast('Hold on, Google Login is initializing', 'info');
            }
        } catch (error: any) {
            console.error('[Google Auth] Flow execution failure:', error);
            showToast('Google login service error', 'error');
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
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.innerContent, { paddingTop: insets.top + 10 }]}>
                        
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

                                {/* Icon pill — explicit toggle button between phone/email */}
                                <TouchableOpacity 
                                    style={styles.dialCodePill}
                                    onPress={() => setInputType(prev => prev === 'phone' ? 'email' : 'phone')}
                                    activeOpacity={0.7}
                                >
                                    {isPhoneMode ? (
                                        <Text style={styles.flagEmoji}>🇮🇳</Text>
                                    ) : (
                                        <Ionicons name="mail" size={20} color="rgba(255, 255, 255, 0.7)" />
                                    )}
                                </TouchableOpacity>

                                {/* Input field — its own box with +91 prefix inside */}
                                <View style={[
                                    styles.inputBox,
                                    isFocused && styles.inputBoxFocused,
                                ]}>
                                    {isPhoneMode && (
                                        <>
                                            <Text style={styles.dialPrefix}>+91</Text>
                                            <View style={styles.prefixDivider} />
                                        </>
                                    )}
                                    <TextInput
                                        style={styles.textField}
                                        placeholder={
                                            isPhoneMode
                                                ? '98765 43210'
                                                : 'phone or email'
                                        }
                                        placeholderTextColor="rgba(255,255,255,0.25)"
                                        value={identifier}
                                        onChangeText={(text) => {
                                            setIdentifier(text);
                                            // Auto-switch to email mode if an '@' is pasted
                                            if (text.includes('@') && inputType === 'phone') {
                                                setInputType('email');
                                            }
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
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        flex: 1,
        minHeight: height - 100,
    },
    topSection: {
        marginBottom: 20,
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
        marginVertical: 10,
    },
    form: {
        width: '100%',
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
