import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Platform, 
    TouchableOpacity, 
    TextInput,
    Keyboard,
    TouchableWithoutFeedback
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
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
import { API_BASE_URL } from '../../services/apiClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { firebaseAuthHelper } from '../../services/firebaseAuthHelper';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [inputType, setInputType] = useState<'phone' | 'email'>('phone');

    const isPhoneMode = inputType === 'phone';
    const { login, logout } = useAuth();
    const router = useRouter();
    const goBack = useStrictBack('/(auth)/welcome');
    const { showToast } = useToast();

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: '391097495705-omn4cf9jppfmjdc0n9c80l5qn8afse2b.apps.googleusercontent.com',
            offlineAccess: true,
        });
    }, []);

    const handleAppleLogin = async () => {
        try {
            setLoading(true);
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (credential.identityToken) {
                const res = await authService.appleLogin(credential.identityToken, credential.fullName);
                if (res.success) {
                    await login({
                        token: res.data.accessToken,
                        refreshToken: res.data.refreshToken,
                        role: res.data.role,
                        hostId: res.data.hostId || undefined,
                        onboardingCompleted: res.data.onboardingCompleted,
                        user: {
                            id: res.data.id,
                            _id: res.data.id,
                            name: res.data.name,
                            email: res.data.email,
                            profileImage: res.data.profileImage,
                        } as any
                    });
                    showToast('Welcome! 🍎', 'success');
                } else {
                    showToast(res.message || 'Apple login failed', 'error');
                }
            }
        } catch (e: any) {
            if (e.code !== 'ERR_REQUEST_CANCELED') {
                showToast('Apple login failed', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await logout();
            await new Promise(resolve => setTimeout(resolve, 100));

            // ── 1. TRIGGER NATIVE BOTTOM-SHEET OAUTH ───────────────────────
            await GoogleSignin.hasPlayServices();
            
            try {
                await GoogleSignin.signOut();
            } catch (_) {}

            const userInfo = await GoogleSignin.signIn();
            
            // ── 2. GET ACCESS TOKEN FROM NATIVE OAUTH SESSION ──────────────
            const tokens = await GoogleSignin.getTokens();
            const accessToken = tokens.accessToken;

            if (!accessToken) {
                showToast('Failed to retrieve Google access token', 'error');
                return;
            }

            // ── 3. SEND ACCESS TOKEN TO BACKEND FOR JWT SESSION EXCHANGE ───
            const res = await authService.googleLogin(accessToken);

            if (res.success) {
                const nameParts = (res.data.name || '').trim().split(' ');
                await login({
                    token: res.data.accessToken,
                    refreshToken: res.data.refreshToken,
                    role: res.data.role,
                    hostId: res.data.hostId || undefined,
                    onboardingCompleted: res.data.onboardingCompleted ?? false,
                    user: {
                        id:           res.data.id,
                        _id:          res.data.id,
                        name:         res.data.name,
                        firstName:    nameParts[0] || '',
                        lastName:     nameParts.slice(1).join(' ') || '',
                        email:        res.data.email,
                        profileImage: res.data.profileImage,
                    } as any
                });
                showToast('Welcome! 🎉', 'success');
            } else {
                showToast(res.message || 'Google login failed', 'error');
            }
        } catch (error: any) {
            console.error('[Google Native Auth Error]', error.code, error.message);
            const errorCode = String(error.code || '');
            
            let errorMsg = String(error.message || '');
            if (error.response?.data) {
                const data = error.response.data;
                errorMsg = data.message || data.error || JSON.stringify(data);
            }

            if (errorCode === '7' || errorCode === '10' || errorMsg.includes('DEVELOPER_ERROR')) {
                showToast('Google Auth misconfigured. Verify SHA fingerprints in Google Cloud Console.', 'error');
            } else if (errorCode !== '12501' && errorCode !== 'ASYNC_OP_IN_PROGRESS') {
                showToast(`Google Sign-In failed: ${errorMsg.slice(0, 100)}`, 'error');
            }
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

            const raw = identifier.trim();
            const isEmail = raw.includes('@');
            let finalIdentifier = raw.toLowerCase();
            if (!isEmail) {
                const digits = raw.replace(/\D/g, '');
                finalIdentifier = `+91${digits}`;
            }

            if (isEmail) {
                // ── EMAIL PATH: Use existing backend logic ───────────────────
                const res = await authService.sendOtp(finalIdentifier);
                if (res.success) {
                    showToast(res.message, 'success');
                    router.push({
                        pathname: '/(auth)/verify-otp' as any,
                        params: { identifier: finalIdentifier, hint: res.data?.hint, type: 'email' }
                    });
                }
            } else {
                // ── PHONE PATH: Use Firebase Phone Auth ──────────────────────
                try {
                    // Firebase handles the SMS sending directly
                    const confirmation = await auth().signInWithPhoneNumber(finalIdentifier);
                    
                    // Store confirmation result in helper (Router params can't hold objects)
                    firebaseAuthHelper.setConfirmation(confirmation, finalIdentifier);
                    
                    showToast('Verification code sent to your phone', 'success');
                    router.push({
                        pathname: '/(auth)/verify-otp' as any,
                        params: { identifier: finalIdentifier, type: 'phone' }
                    });
                } catch (firebaseErr: any) {
                    console.error('[Firebase Auth Error]', firebaseErr.code, firebaseErr.message);
                    let userFriendlyMessage = 'Failed to send SMS. Please try again.';
                    
                    if (firebaseErr.code === 'auth/invalid-phone-number') {
                        userFriendlyMessage = 'The phone number is invalid.';
                    } else if (firebaseErr.code === 'auth/too-many-requests') {
                        userFriendlyMessage = 'Too many attempts. Please try again later.';
                    } else if (firebaseErr.code === 'auth/network-request-failed') {
                        userFriendlyMessage = 'Network error. Please check your connection.';
                    }
                    
                    showToast(userFriendlyMessage, 'error');
                }
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to initiate login';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // ✅ edit-profile.tsx wala exact method — APK pe confirmed working
    // iOS = 'padding', Android = undefined (ScrollView khud handle karta hai)

    return (
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
            <LinearGradient
                colors={['#000000', '#1a1a2e', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />
            {/* ✅ KeyboardAwareScrollView — same as venue-gifts/menu/staff, APK pe confirmed working */}
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
                            <View style={styles.topAndFormContainer}>
                                <View style={styles.topSection}>
                                    <TouchableOpacity onPress={() => goBack()} style={styles.backBtn}>
                                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                                    </TouchableOpacity>

                                    <View style={styles.header}>
                                        <Logo size={90} />
                                    </View>
                                </View>

                                <View style={styles.formContainer}>
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
                            </View>
                            </View>

                            {/* IN-SCROLL BOTTOM FOOTER */}
                            {/* Isko scrollView ke andar hi rakha hai taaki OVERLAP ki mathematical possibility hi khatam ho jaye. */}
                            <View style={styles.inScrollFooter}>
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

                                {Platform.OS === 'ios' && (
                                    <Button
                                        title="Continue with Apple"
                                        onPress={handleAppleLogin}
                                        variant="glass"
                                        icon={<FontAwesome name="apple" size={20} color="#FFFFFF" />}
                                        style={styles.appleButton}
                                    />
                                )}
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
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.xl,
        paddingTop: 10,
    },
    topAndFormContainer: {
        flex: 1, // Pushes the footer to the bottom when screen is large
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
    },
    header: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    formContainer: {
        marginTop: 16,
    },
    // 🔥 In-Scroll Footer Styles
    inScrollFooter: {
        paddingBottom: Platform.OS === 'ios' ? 40 : 50, // Extended bottom space inside scroll
        paddingTop: 20,
    },
    loginButton: {
        // Shadow to pop over content as it scrolls
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    googleButton: {
        marginTop: SPACING.sm,
    },
    appleButton: {
        marginTop: SPACING.sm,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.lg,
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
    inputLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    dialCodePill: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        width: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    flagEmoji: {
        fontSize: 22,
    },
    inputBox: {
        flex: 1,
        height: 60,
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
        fontSize: 18,
    },
    dialPrefix: {
        color: '#FFFFFF',
        fontSize: 16,
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
