import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Dimensions, 
    Modal,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface OfflineScreenProps {
    isVisible: boolean;
    onRetry: () => void;
}

export default function OfflineScreen({ isVisible, onRetry }: OfflineScreenProps) {
    if (!isVisible) return null;

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={['rgba(11, 15, 26, 0.95)', 'rgba(20, 15, 35, 0.98)', '#030303']}
                    style={styles.card}
                >
                    {/* Upper decorations */}
                    <View style={styles.topNav}>
                        <TouchableOpacity style={styles.closeBtn} disabled>
                            <Ionicons name="close" size={24} color="rgba(255,255,255,0.2)" />
                        </TouchableOpacity>
                        <View style={styles.searchingBadge}>
                            <View style={styles.dot} />
                            <Text style={styles.searchingText}>SEARCHING...</Text>
                        </View>
                    </View>

                    {/* Central Icon */}
                    <View style={styles.content}>
                        <View style={styles.iconOuterGlow}>
                            <View style={styles.iconInnerGlow}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="wifi-outline" size={48} color={COLORS.primary} style={styles.wifiIcon} />
                                    <View style={styles.slashLine} />
                                </View>
                            </View>
                        </View>

                        <Text style={styles.title}>Connection Lost</Text>
                        <Text style={styles.subtitle}>
                            The beat goes on, but your connection don't. Please check your network to resume the experience.
                        </Text>
                    </View>

                    {/* Bottom Section */}
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={styles.retryBtn} 
                            onPress={onRetry}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#7C4DFF', '#5E35B1']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.buttonGradient}
                            >
                                <Text style={styles.retryText}>TRY AGAIN</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        
                        <Text style={styles.autoReconnectText}>AUTO-RECONNECTING WHEN AVAILABLE</Text>
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        height: height * 0.8,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.2)',
        overflow: 'hidden',
        padding: SPACING.xl,
        justifyContent: 'space-between',
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    },
    searchingText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
    },
    content: {
        alignItems: 'center',
        gap: 32,
    },
    iconOuterGlow: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(124, 77, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconInnerGlow: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(124, 77, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    wifiIcon: {
        opacity: 0.8,
    },
    slashLine: {
        position: 'absolute',
        width: 60,
        height: 3,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
        transform: [{ rotate: '-45deg' }],
    },
    title: {
        color: 'white',
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    footer: {
        alignItems: 'center',
        gap: 16,
    },
    retryBtn: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    buttonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    autoReconnectText: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    }
});
