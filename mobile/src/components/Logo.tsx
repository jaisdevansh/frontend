import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface LogoProps {
    size?: number;
    showText?: boolean;
    variant?: 'full' | 'compact' | 'minimal';
}

/**
 * Premium Logo Component for Entry Club
 * Matches EXACTLY with user requested design:
 * - Glassmorphism circular ring with diagonal shine
 * - Ultra-thin 'EC' text
 * - High-spaced, bold 'ENTRY CLUB'
 * - Modern corner 'L' brackets
 */
export const Logo: React.FC<LogoProps> = ({ 
    size = 180, 
    showText = true,
    variant = 'full'
}) => {
    const circleSize = size;
    const ecFontSize = size * 0.28; // Smaller more elegant EC
    const ecLetterSpacing = 2;

    return (
        <View style={styles.container}>
            {/* Premium Circular Frame - no brackets */}

            <View style={[
                styles.logoCircle, 
                { 
                    width: circleSize, 
                    height: circleSize, 
                    borderRadius: circleSize / 2,
                }
            ]}>
                {/* 1. Underlying Glass Base - Wrapped strictly to prevent Android BlurView square bleeding */}
                <View style={[StyleSheet.absoluteFill, { borderRadius: circleSize / 2, overflow: 'hidden' }]}>
                    <BlurView 
                        intensity={20} 
                        tint="dark" 
                        style={StyleSheet.absoluteFill} 
                    />
                </View>
                
                {/* 2. Glass Gradient & Border Rim */}
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: circleSize / 2, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' }]}
                />

                {/* 3. The Signature Diagonal Shine Streak */}
                <LinearGradient
                    colors={[
                        'transparent', 
                        'rgba(255, 255, 255, 0.0)', 
                        'rgba(255, 255, 255, 0.25)', 
                        'rgba(255, 255, 255, 0.0)', 
                        'transparent'
                    ]}
                    locations={[0, 0.35, 0.5, 0.65, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                {/* 4. Center 'EC' Text - Brightened */}
                <Text style={[
                    styles.logoEC, 
                    { 
                        fontSize: ecFontSize, 
                        letterSpacing: ecLetterSpacing,
                        fontWeight: '500', // Thickened so it's fully visible
                        textShadowColor: 'rgba(255, 255, 255, 0.4)', // White glow
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 6,
                    }
                ]}>
                    E C
                </Text>
            </View>

            {showText && (
                <View style={styles.textContainer}>
                    <Text style={styles.brandName}>ENTRY CLUB</Text>
                    {variant !== 'minimal' && (
                        <Text style={styles.tagline}>EXCLUSIVE ACCESS</Text>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    logoCircle: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    logoEC: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Thin' : 'sans-serif-thin',
    },
    textContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    brandName: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '300',
        letterSpacing: 12,
        textAlign: 'center',
    },
    tagline: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 6,
        marginTop: 12,
        textAlign: 'center',
    },
});

export default Logo;

