import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/design-system';
import { Button } from '../../components/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '../../components/Logo';
import { Image } from 'expo-image';
import Animated, { 
    useSharedValue, 
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    Extrapolation
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Curated Nightlife',
        subtitle: "Discover the city's most exclusive venues, handpicked for the discerning few.",
        image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=1000&auto=format&fit=crop',
        isLocal: false
    },
    {
        id: '2',
        title: 'Exclusive Access',
        subtitle: 'Experience the pinnacle of nightlife. Skip the lines and walk right into the most sought-after events.',
        image: require('../../assets/images/slide2.png'),
        isLocal: true
    },
    {
        id: '3',
        title: 'VIP Treatment',
        subtitle: 'Elevate your nights with premium table service and bespoke experiences crafted just for you.',
        image: require('../../assets/images/slide3.png'),
        isLocal: true
    }
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useSharedValue(0);
    const slidesRef = useRef<FlatList>(null);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const viewableItemsChanged = useCallback(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }, []);

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    useEffect(() => {
        let isMounted = true;
        const interval = setInterval(() => {
            if (isMounted && slidesRef.current && SLIDES.length > 0) {
                let nextIndex = currentIndex + 1;
                if (nextIndex >= SLIDES.length) {
                    nextIndex = 0;
                }
                slidesRef.current.scrollToIndex({ index: nextIndex, animated: true });
            }
        }, 4000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [currentIndex]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Slider / Carousel Backgrounds */}
            <View style={StyleSheet.absoluteFillObject}>
                <AnimatedFlatList
                    data={SLIDES}
                    ref={slidesRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item: any) => item.id}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    renderItem={({ item }: { item: any }) => (
                        <View style={{ width, height, backgroundColor: '#000' }}>
                            <Image 
                                source={item.isLocal ? item.image : { uri: item.image }} 
                                style={[styles.backgroundImage, StyleSheet.absoluteFill]}
                                contentFit="cover"
                                transition={700}
                                cachePolicy="memory-disk" 
                            />
                            {/* Balanced Gradient: clear at top, dark at bottom for text */}
                            <LinearGradient
                                colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', '#000000', '#000000']}
                                locations={[0, 0.45, 0.8, 1]}
                                style={StyleSheet.absoluteFillObject}
                            />
                        </View>
                    )}
                />
            </View>

            <View style={[styles.contentOverlay, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
                
                {/* Logo Section */}
                {/* Removed jumping/entering animations as requested */}
                <View style={styles.logoSection}>
                    <View style={styles.animatedLogoWrapper}>
                        <Logo size={140} showText={false} variant="full" />
                    </View>
                    <View style={styles.brandTextContainer}>
                        <Text style={styles.brandName}>ENTRY CLUB</Text>
                        <View style={styles.brandUnderline} />
                        <Text style={styles.tagline}>EXCLUSIVE ACCESS</Text>
                    </View>
                </View>

                {/* Bottom Action Section */}
                <View style={styles.actionSection}>
                    <View style={styles.textWrapper}>
                        <Text style={styles.title}>{SLIDES[currentIndex].title}</Text>
                        <Text style={styles.subtitle}>{SLIDES[currentIndex].subtitle}</Text>
                    </View>

                    {/* Highly Performant Reanimated Indicator Dots */}
                    <View style={styles.indicatorContainer}>
                         {SLIDES.map((_, i) => {
                            const animatedIndicatorStyle = useAnimatedStyle(() => {
                                const dotWidth = interpolate(
                                    scrollX.value,
                                    [(i - 1) * width, i * width, (i + 1) * width],
                                    [8, 24, 8],
                                    Extrapolation.CLAMP
                                );
                                const opacity = interpolate(
                                    scrollX.value,
                                    [(i - 1) * width, i * width, (i + 1) * width],
                                    [0.3, 1, 0.3],
                                    Extrapolation.CLAMP
                                );
                                return {
                                    width: dotWidth,
                                    opacity,
                                    transform: [{ scale: interpolate(opacity, [0.3, 1], [0.8, 1]) }]
                                };
                            });

                            return (
                                <Animated.View 
                                    key={i.toString()} 
                                    style={[styles.indicator, animatedIndicatorStyle]} 
                                />
                            );
                        })}
                    </View>

                    <View style={styles.buttonContainer}>
                        <Button
                            title="Get Started"
                            onPress={() => router.push('/(auth)/signup' as any)}
                            style={styles.primaryBtn}
                        />
                        <TouchableOpacity
                            onPress={() => router.push('/(auth)/login' as any)}
                            style={styles.secondaryBtn}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.secondaryBtnText}>
                                Already have an account? <Text style={styles.link}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    contentOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        zIndex: 10,
    },
    logoSection: {
        alignItems: 'center',
        paddingTop: 20, 
    },
    animatedLogoWrapper: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    brandTextContainer: {
        marginTop: 5,
        alignItems: 'center',
    },
    brandName: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '300',
        letterSpacing: 14,
        textAlign: 'center',
        paddingLeft: 14,
    },
    brandUnderline: {
        width: 40,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginTop: 14,
        marginBottom: 14,
    },
    tagline: {
        color: 'rgba(255, 255, 255, 0.45)',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 7,
        textAlign: 'center',
        paddingLeft: 7,
    },
    actionSection: {
        width: '100%',
        paddingBottom: 10, 
    },
    textWrapper: {
        marginBottom: 24,
        alignItems: 'flex-start', 
        minHeight: 90, 
        justifyContent: 'center'
    },
    title: {
        color: 'white',
        fontSize: 38,
        fontWeight: '700',
        marginBottom: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 8,
        textAlign: 'left',
        letterSpacing: 0.5
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'left',
        fontWeight: '400',
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 36, 
        paddingLeft: 2,
    },
    indicator: {
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginHorizontal: 5,
    },
    buttonContainer: {
        gap: 16,
    },
    primaryBtn: {
        width: '100%',
        height: 56,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    secondaryBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    secondaryBtnText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontWeight: '600',
    },
    link: {
        color: COLORS.primary,
        fontWeight: '700',
    },
});
