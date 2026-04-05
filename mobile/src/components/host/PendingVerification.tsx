import React, { useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    Animated, Dimensions, StatusBar, ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const COLORS = {
    bg: '#0A0F1C',
    primary: '#3B82F6',
    accent: '#60A5FA',
    textPrimary: '#EAF2FF',
    textSecondary: '#9FB3C8',
    cardBg: 'rgba(12, 18, 33, 0.7)',
    border: 'rgba(59, 130, 246, 0.15)',
    glow: 'rgba(59, 130, 246, 0.4)',
};

interface PendingVerificationProps {
    onLogout: () => void;
    onSupport: () => void;
}

export const PendingVerification: React.FC<PendingVerificationProps> = ({ onLogout, onSupport }) => {
    const insets = useSafeAreaInsets();
    
    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance sequence
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
        ]).start();

        // Pulse loop for the glow ring
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 2000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            ])
        ).start();

        // Subtle floating for the card
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -10, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Background Aura Blobs */}
            <LinearGradient 
                colors={['rgba(59, 130, 246, 0.08)', 'rgba(0,0,0,0)']} 
                style={[styles.aura, { top: -height * 0.1, left: -width * 0.2 }]} 
            />
            <LinearGradient 
                colors={['rgba(59, 130, 246, 0.08)', 'rgba(0,0,0,0)']} 
                style={[styles.aura, { bottom: -height * 0.1, right: -width * 0.2 }]} 
            />

            <View 
                style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
            >
                <Animated.View style={[styles.innerContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    
                    {/* Top Icon Section */}
                    <View style={styles.iconSection}>
                        <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }] }]} />
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="shield-check-outline" size={50} color={COLORS.primary} />
                        </View>
                    </View>

                    {/* Typography */}
                    <View style={styles.textStack}>
                        <Text style={styles.title}>Verification Submitted</Text>
                        <Text style={styles.subtitle}>You’ll be notified once approved by admin</Text>
                    </View>

                    {/* Premium Glass Card */}
                    <Animated.View style={[styles.glassCard, { transform: [{ translateY: floatAnim }] }]}>
                        <View style={styles.statusHeader}>
                            <View style={styles.statusLabel}>
                                <View style={styles.dot} />
                                <Text style={styles.statusText}>Under Review</Text>
                            </View>
                            <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.accent} />
                        </View>
                        
                        <View style={styles.etaContainer}>
                            <Text style={styles.etaTitle}>Estimated Time</Text>
                            <Text style={styles.etaValue}>Within 24 hours</Text>
                        </View>
                        
                        <View style={styles.cardDivider} />
                        
                        <View style={styles.noteBox}>
                            <Ionicons name="information-circle-outline" size={16} color={COLORS.accent} />
                            <Text style={styles.noteText}>Our specialized team is currently auditing your identity and KYC documents.</Text>
                        </View>
                    </Animated.View>

                    {/* Action Buttons */}
                    <View style={styles.buttonStack}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={onSupport} activeOpacity={0.8}>
                            <LinearGradient 
                                colors={[COLORS.primary, '#1D4ED8']} 
                                start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
                                style={styles.gradient}
                            >
                                <Text style={styles.primaryBtnText}>Contact Support</Text>
                                <Ionicons name="chatbubbles" size={20} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryBtn} onPress={onLogout} activeOpacity={0.7}>
                            <Text style={styles.secondaryBtnText}>Sign Out from Terminal</Text>
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { 
        flex: 1, 
        paddingHorizontal: 28, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    innerContent: {
        width: '100%',
        alignItems: 'center',
    },
    aura: { 
        position: 'absolute', 
        width: width * 1.2, 
        height: width * 1.2, 
        borderRadius: width * 0.6,
        opacity: 0.5 
    },
    iconSection: { 
        width: 110, 
        height: 110, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 24
    },
    glowRing: { 
        position: 'absolute', 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        borderWidth: 2, 
        borderColor: COLORS.glow,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    iconContainer: { 
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        backgroundColor: 'rgba(59, 130, 246, 0.05)', 
        justifyContent: 'center', 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)'
    },
    textStack: { alignItems: 'center', marginBottom: 32 },
    title: { 
        color: COLORS.textPrimary, 
        fontSize: 28, 
        fontWeight: '900', 
        textAlign: 'center', 
        letterSpacing: -0.5,
        marginBottom: 8 
    },
    subtitle: { 
        color: COLORS.textSecondary, 
        fontSize: 14, 
        textAlign: 'center', 
        fontWeight: '500', 
        lineHeight: 20,
        paddingHorizontal: 10
    },
    glassCard: { 
        width: '100%', 
        backgroundColor: COLORS.cardBg, 
        borderRadius: 28, 
        padding: 20, 
        borderWidth: 1, 
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        marginBottom: 32
    },
    statusHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16
    },
    statusLabel: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(59, 130, 246, 0.1)', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)'
    },
    dot: { 
        width: 6, 
        height: 6, 
        borderRadius: 3, 
        backgroundColor: COLORS.primary, 
        marginRight: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
    },
    statusText: { 
        color: COLORS.primary, 
        fontSize: 13, 
        fontWeight: '800', 
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    etaContainer: {
        marginTop: 4,
    },
    etaTitle: { 
        color: COLORS.textSecondary, 
        fontSize: 12, 
        fontWeight: '600',
        marginBottom: 4
    },
    etaValue: { 
        color: COLORS.textPrimary, 
        fontSize: 18, 
        fontWeight: '800' 
    },
    cardDivider: { 
        height: 1, 
        backgroundColor: 'rgba(255,255,255,0.05)', 
        marginVertical: 20 
    },
    noteBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12 
    },
    noteText: { 
        color: COLORS.textSecondary, 
        fontSize: 13, 
        fontWeight: '500',
        flex: 1
    },
    buttonStack: { width: '100%', gap: 16 },
    primaryBtn: { height: 64, borderRadius: 24, overflow: 'hidden' },
    gradient: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 12 
    },
    primaryBtnText: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: '800' 
    },
    secondaryBtn: { 
        height: 64, 
        borderRadius: 24, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        backgroundColor: 'rgba(255,255,255,0.02)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    secondaryBtnText: { 
        color: COLORS.textPrimary, 
        fontSize: 15, 
        fontWeight: '700' 
    },
    footer: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        alignItems: 'center' 
    },
    footerText: { 
        color: 'rgba(255,255,255,0.1)', 
        fontSize: 10, 
        fontWeight: '800', 
        letterSpacing: 2, 
        textTransform: 'uppercase' 
    }
});
