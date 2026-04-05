import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Polygon, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface DiamondLogoProps {
    size?: number;
    color?: string;
    showGlass?: boolean;
}

export const DiamondLogo: React.FC<DiamondLogoProps> = ({ 
    size = 180, 
    color = "rgba(255, 255, 255, 0.9)",
    showGlass = true 
}) => {
    // Elegant diamond proportions based on the user's reference
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {showGlass && (
                <>
                    <BlurView 
                        intensity={40} 
                        tint="dark" 
                        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} 
                    />
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' }]}
                    />
                    {/* The Signature Diagonal Shine Streak */}
                    <LinearGradient
                        colors={[
                            'transparent', 
                            'rgba(255, 255, 255, 0.0)', 
                            'rgba(255, 255, 255, 0.3)', 
                            'rgba(255, 255, 255, 0.0)', 
                            'transparent'
                        ]}
                        locations={[0, 0.4, 0.5, 0.6, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
                    />
                </>
            )}

            <View style={styles.diamondWrapper}>
                <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 100 100" fill="none">
                    {/* Outer Diamond Shell */}
                    <Polygon 
                        points="50,95 10,40 30,10 70,10 90,40" 
                        stroke={color} strokeWidth="2" strokeLinejoin="round" 
                    />
                    {/* Horizontal Line */}
                    <Line x1="10" y1="40" x2="90" y2="40" stroke={color} strokeWidth="2" />
                    
                    {/* Vertical Center Line */}
                    <Line x1="50" y1="95" x2="50" y2="40" stroke={color} strokeWidth="2" />
                    <Line x1="50" y1="40" x2="50" y2="10" stroke={color} strokeWidth="2" />

                    {/* Bottom to Top Edges Triangles */}
                    <Line x1="50" y1="95" x2="30" y2="40" stroke={color} strokeWidth="2" />
                    <Line x1="50" y1="95" x2="70" y2="40" stroke={color} strokeWidth="2" />

                    {/* Top Cross X inside crown */}
                    <Line x1="30" y1="10" x2="50" y2="40" stroke={color} strokeWidth="2" />
                    <Line x1="70" y1="10" x2="50" y2="40" stroke={color} strokeWidth="2" />
                    <Line x1="30" y1="40" x2="50" y2="10" stroke={color} strokeWidth="2" />
                    <Line x1="70" y1="40" x2="50" y2="10" stroke={color} strokeWidth="2" />
                </Svg>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    diamondWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    }
});
