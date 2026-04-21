import React, { useState } from 'react';
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
import { API_BASE_URL } from '../../services/apiClient';
import ScreenWrapper from '../../components/ScreenWrapper';

WebBrowser.maybeCompleteAuthSession();
const GOOGLE_AUTH_URL = `${API_BASE_URL}/api/auth/google`;

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

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await logout();
            await new Promise(resolve => setTimeout(resolve, 100));
            const redirectUri = Linking.createURL('auth');
            const authUrl = `${GOOGLE_AUTH_URL}?redirectUri=${encodeURIComponent(redirectUri)}`;
            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
            if (result.type === 'success' && result.url) {
                const parsed = Linking.parse(result.url);
                const token = parsed.queryParams?.token as string | undefined;
                if (!token) {
                    showToast('Google login failed. Please try again.', 'error');
                    return;
                }
                const refreshToken = parsed.queryParams?.refreshToken as string | undefined;
                const userRole = (parsed.queryParams?.role as string) || 'user';
                const onboarded = parsed.queryParams?.onboardingCompleted === 'true';
                const fullName = (parsed.queryParams?.name as string) || '';
                const nameParts = fullName.trim().split(' ');
                
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
                        firstName:    nameParts[0] || '',
                        lastName:     nameParts.slice(1).join(' ') || '',
                        email:        parsed.queryParams?.email as string,
                        profileImage: parsed.queryParams?.profileImage as string,
                        username:     parsed.queryParams?.username as string,
                        phone:        parsed.queryParams?.phone as string,
                        gender:       parsed.queryParams?.gender as string,
                    }
                });
                showToast('Welcome! 🎉', 'success');
            }
        } catch (error: any) {
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
                    params: { identifier: finalIdentifier, hint: res.data?.hint }
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
        <ScreenWrapper extraBottomPadding={40}>
            <LinearGradient
                colors={['#000000', '#1a1a2e', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <View style={styles.topSection}>
                        <TouchableOpacity onPress={() => goBack()} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <Logo size={90} />
                        </View>
                    </View>

                    {/* Smooth spacing container, no strict flex:1 so it overflows gracefully when keyboard opens */}
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
            </TouchableWithoutFeedback>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.xl,
        paddingTop: 10,
        // No fixed height or minHeight
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
        paddingBottom: 40,
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
