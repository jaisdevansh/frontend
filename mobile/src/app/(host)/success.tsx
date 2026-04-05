import React, { useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, Animated, 
    Dimensions, StatusBar, TouchableOpacity 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLORS = {
    bg: '#0A0F1C',
    primary: '#3B82F6',
    success: '#10B981',
    textPrimary: '#EAF2FF',
    textSecondary: '#9FB3C8',
};

export default function VerificationSuccess() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const textFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            // 1. Pop the checkmark
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true
            }),
            // 2. Fade in the background glow
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true
            }),
            // 3. Fade in text and button
            Animated.timing(textFadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    const handleContinue = () => {
        router.replace('/(host)/dashboard' as any);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#0A0F1C', '#05070A']} style={StyleSheet.absoluteFill} />

            {/* Success Aura */}
            <Animated.View style={[styles.aura, { opacity: fadeAnim }]}>
                <LinearGradient 
                    colors={['rgba(16, 185, 129, 0.15)', 'transparent']} 
                    style={styles.auraCircle} 
                />
            </Animated.View>

            <View style={styles.content}>
                {/* Animated Icon */}
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.successRing}>
                        <Ionicons name="checkmark-sharp" size={60} color={COLORS.success} />
                    </View>
                </Animated.View>

                {/* Text Content */}
                <Animated.View style={[styles.textContent, { opacity: textFadeAnim }]}>
                    <Text style={styles.title}>All Set!</Text>
                    <Text style={styles.subtitle}>
                        Your verification details have been securely uploaded to our admin terminal for auditing.
                    </Text>
                </Animated.View>

                {/* Glass Card Details */}
                <Animated.View style={[styles.infoCard, { opacity: textFadeAnim }]}>
                    <View style={styles.infoRow}>
                        <Feather name="shield" size={18} color={COLORS.success} />
                        <Text style={styles.infoText}>Biometric Security Verification</Text>
                        <Text style={styles.statusLabel}>OK</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <Feather name="file-text" size={18} color={COLORS.success} />
                        <Text style={styles.infoText}>KYC Documents Uploaded</Text>
                        <Text style={styles.statusLabel}>SENT</Text>
                    </View>
                </Animated.View>
            </View>

            {/* Bottom Button */}
            <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 30, opacity: textFadeAnim }]}>
                <TouchableOpacity style={styles.mainBtn} onPress={handleContinue} activeOpacity={0.8}>
                    <LinearGradient 
                        colors={['#10B981', '#059669']} 
                        style={styles.btnGradient} 
                        start={{x:0, y:0}} end={{x:1, y:0}}
                    >
                        <Text style={styles.btnText}>Go to Dashboard</Text>
                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    aura: { 
        position: 'absolute', 
        top: '20%', 
        left: 0, 
        right: 0, 
        alignItems: 'center' 
    },
    auraCircle: { 
        width: width * 1.5, 
        height: width * 1.5, 
        borderRadius: width * 0.75 
    },
    content: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingHorizontal: 40 
    },
    iconContainer: { 
        width: 160, 
        height: 160, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 40 
    },
    successRing: { 
        width: 120, 
        height: 120, 
        borderRadius: 60, 
        backgroundColor: 'rgba(16, 185, 129, 0.08)', 
        borderWidth: 2, 
        borderColor: 'rgba(16, 185, 129, 0.2)', 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    textContent: { alignItems: 'center', marginBottom: 40 },
    title: { 
        color: COLORS.textPrimary, 
        fontSize: 36, 
        fontWeight: '900', 
        marginBottom: 16 
    },
    subtitle: { 
        color: COLORS.textSecondary, 
        fontSize: 15, 
        textAlign: 'center', 
        lineHeight: 22, 
        fontWeight: '500' 
    },
    infoCard: { 
        width: '100%', 
        backgroundColor: 'rgba(255, 255, 255, 0.02)', 
        borderRadius: 24, 
        padding: 20, 
        borderWidth: 1, 
        borderColor: 'rgba(255, 255, 255, 0.04)' 
    },
    infoRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12 
    },
    infoText: { 
        flex: 1, 
        color: COLORS.textPrimary, 
        fontSize: 13, 
        fontWeight: '600' 
    },
    statusLabel: { 
        color: COLORS.success, 
        fontSize: 10, 
        fontWeight: '900', 
        letterSpacing: 1 
    },
    divider: { 
        height: 1, 
        backgroundColor: 'rgba(255, 255, 255, 0.04)', 
        marginVertical: 15 
    },
    footer: { paddingHorizontal: 40 },
    mainBtn: { height: 60, borderRadius: 20, overflow: 'hidden' },
    btnGradient: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 8 
    },
    btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
